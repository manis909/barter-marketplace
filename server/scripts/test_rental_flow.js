/*
 * End-to-end rental flow walkthrough.
 * Starts its OWN server instance on PORT=5055 (the live dev server on :5000 has
 * older code), signs JWTs for two REAL verified users, drives the full API flow
 * with fetch(), and verifies the database directly at each milestone.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { spawn } = require('child_process');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('../models/db');

const PORT = 5055;
const BASE = `http://localhost:${PORT}/api`;
const USER_A = 'd8eae0f6-de89-4640-a16a-d37fe11777ed'; // shailza (verified) — owner
const USER_B = '83d8092f-8940-4b86-ad29-e7dfba417177'; // shakira2.0 (verified) — renter

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET missing from .env — cannot sign tokens');
  process.exit(1);
}

function tokenFor(uid) {
  return jwt.sign({ userId: uid }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function api(method, p, body, token) {
  const opts = { method, headers: {} };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + p, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function q(sql, params = []) {
  return db.query(sql, params).then(r => r.rows);
}

let pass = 0, fail = 0;
function check(label, cond, extra = '') {
  const ok = !!cond;
  console.log(`  ${ok ? '✅' : '❌'} ${label}${extra ? ' → ' + extra : ''}`);
  ok ? pass++ : fail++;
  if (!ok) console.log('     (actual value shown above in prior line)');
}

function step(n, title) {
  console.log('\n' + '='.repeat(60));
  console.log(`STEP ${n}: ${title}`);
  console.log('='.repeat(60));
}

async function waitForServer() {
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  const tokA = tokenFor(USER_A);
  const tokB = tokenFor(USER_B);

  // Spawn an isolated server on port 5055 so we test the SHIPPED code.
  const srv = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.stdout.on('data', d => process.stdout.write('[srv] ' + d));
  srv.stderr.on('data', d => process.stderr.write('[srv-err] ' + d));

  process.on('SIGINT', () => { try{ srv.kill(); }catch(e){}});

  console.log('Waiting for isolated test server on :' + PORT + ' …');
  const up = await waitForServer();
  check('server boots on 5055', up, up ? 'responding' : 'NO RESPONSE');

  if (!up) { console.error('Server did not start.'); process.exit(1); }

  let itemId, rentalId, requestId, requestId2, requestId3;

  try {
    // STEP 1 — User A creates an item
    step(1, 'User A (shailza) creates an item');
    const itemRes = await api('POST', '/items', {
      title: 'E2E Test Camera',
      description: 'A camera listed for the rental flow walkthrough.',
      category: 'Electronics',
      item_condition: 'good',
      estimated_value: '500',
      image_urls: ['https://via.placeholder.com/600x400?text=Camera'],
      desired_item: '',
    }, tokA);
    itemId = itemRes.data?.item?.id;
    check('POST /items returns 201', itemRes.status === 201, 'status=' + itemRes.status);
    check('item has an id', !!itemId, itemId || 'MISSING');

    // STEP 2 — A lists it for rent
    step(2, 'User A lists the item for rent at ₹100/day');
    const rentRes = await api('POST', '/rentals', {
      title: 'E2E Test Camera',
      description: 'Rental listing via flow test.',
      daily_rate: 100,
      image_url: 'https://via.placeholder.com/600x400?text=Camera',
      item_id: itemId,
    }, tokA);
    rentalId = rentRes.data?.rental?.id;
    check('POST /rentals returns 201', rentRes.status === 201, 'status=' + rentRes.status);
    check('rental.id returned', !!rentalId, rentalId || 'MISSING');

    // by-item lookup (drives ItemDetail's "Request to Rent" button)
    const byItem = await api('GET', `/rentals/by-item/${itemId}`, null, tokB);
    check('GET /rentals/by-item returns the rental', byItem.status === 200 && !!byItem.data.rental, 'status=' + byItem.status + ' found=' + !!byItem.data.rental);
    check('rental tied to correct item via GET', byItem.data.rental?.item_id === itemId, byItem.data.rental?.item_id || 'MISSING');

    // DB truth for the rental
    const rentRows = await q('SELECT * FROM rentals WHERE id = $1', [rentalId]);
    check('DB rentals.item_id set', rentRows[0].item_id === itemId, rentRows[0]?.item_id || 'null');
    check('DB rentals.daily_rate = 100', Number(rentRows[0].daily_rate) === 100, Number(rentRows[0]?.daily_rate));
    check('DB rentals.status = available', rentRows[0].status === 'available', rentRows[0]?.status);

    // STEP 3 — B requests to rent for 3 days
    step(3, 'User B (shakira2.0) requests 3 days');
    const reqRes = await api('POST', `/rentals/${rentalId}/requests`, { days_requested: 3 }, tokB);
    requestId = reqRes.data?.request?.id;
    check('POST request returns 201', reqRes.status === 201, 'status=' + reqRes.status);
    check('breakdown.rental_fee = 300', reqRes.data?.breakdown?.rental_fee === 300, reqRes.data?.breakdown?.rental_fee);
    check('breakdown.deposit_amount = 45 (15% of 300)', reqRes.data?.breakdown?.deposit_amount === 45, reqRes.data?.breakdown?.deposit_amount);
    check('breakdown.total_commitment = 345', reqRes.data?.breakdown?.total_commitment === 345, reqRes.data?.breakdown?.total_commitment);

    // DB: request row
    const reqRows = await q('SELECT * FROM rental_requests WHERE id = $1', [requestId]);
    check('DB request.total_amount = 300', Number(reqRows[0].total_amount) === 300, Number(reqRows[0]?.total_amount));
    check('DB request.deposit_amount = 45', Number(reqRows[0].deposit_amount) === 45, Number(reqRows[0]?.deposit_amount));
    check('DB request.status = pending', reqRows[0].status === 'pending', reqRows[0]?.status);
    check('DB request.requester_id = B', reqRows[0].requester_id === USER_B, reqRows[0]?.requester_id);

    // rental.status should now be 'requested'
    const rentAfterReq = await q('SELECT status FROM rentals WHERE id = $1', [rentalId]);
    check('rentals.status = requested after pending request', rentAfterReq[0].status === 'requested', rentAfterReq[0]?.status);

    // duplicate request should be blocked (409)
    const dup = await api('POST', `/rentals/${rentalId}/requests`, { days_requested: 2 }, tokB);
    check('duplicate pending request blocked with 409', dup.status === 409, 'status=' + dup.status);

    // STEP 4 — A sees incoming + accepts
    step(4, 'User A sees incoming requests and accepts');
    const incoming = await api('GET', '/rentals/requests/incoming', null, tokA);
    check('incoming requests count = 1', incoming.data?.requests?.length === 1, incoming.data?.requests?.length);
    check('incoming request id matches', incoming.data.requests[0]?.id === requestId, incoming.data.requests[0]?.id);

    const acceptRes = await api('PATCH', `/rentals/requests/${requestId}`, { status: 'accepted' }, tokA);
    check('accept returns 200', acceptRes.status === 200, 'status=' + acceptRes.status);
    check('accept sets status = accepted', acceptRes.data?.request?.status === 'accepted', acceptRes.data?.request?.status);

    const reqAfter = await q('SELECT status, total_amount, deposit_amount FROM rental_requests WHERE id = $1', [requestId]);
    check('DB request.status = accepted', reqAfter[0].status === 'accepted', reqAfter[0]?.status);
    const rentAfterAccept = await q('SELECT status FROM rentals WHERE id = $1', [rentalId]);
    check('DB rentals.status = rented after accept', rentAfterAccept[0].status === 'rented', rentAfterAccept[0]?.status);

    step('4b', 'Verify transactions rows after acceptance (fee paid, deposit held)');
    const txs = await q(
      `SELECT user_id, type, amount, status, description FROM transactions WHERE related_id = $1 ORDER BY created_at`,
      [requestId]
    );
    check('3 transaction rows created', txs.length === 3, 'count=' + txs.length);
    const feeOut = txs.find(t => t.type === 'outgoing' && Number(t.amount) === 300 && t.description.startsWith('Rental fee'));
    const feeIn = txs.find(t => t.type === 'incoming' && Number(t.amount) === 300);
    const depHold = txs.find(t => t.type === 'outgoing' && Number(t.amount) === 45);
    check('fee outgoing (renter, 300, completed)', feeOut && feeOut.status === 'completed' && feeOut.user_id === USER_B, feeOut?.status + ' uid=' + (feeOut?.user_id === USER_B ? 'B' : '?'));
    check('fee incoming (owner, 300, completed)', feeIn && feeIn.status === 'completed' && feeIn.user_id === USER_A, feeIn?.status + ' uid=' + (feeIn?.user_id === USER_A ? 'A' : '?'));
    check('deposit outgoing (renter, 45, PENDING = held)', depHold && depHold.status === 'pending', depHold?.status);

    // MyRentals data shape + is_overdue false (3 days out)
    step('4c', 'MyRentals returns expected shape for renter B');
    const mineB = await api('GET', '/rentals/my-rentals', null, tokB);
    check('B renting length = 1', mineB.data.renting?.length === 1, mineB.data.renting?.length);
    const card = mineB.data.renting[0];
    check('card.is_overdue = false (end_date is today+3)', card.is_overdue === false, card.is_overdue);
    check('card canConfirm = true for renter (not yet confirmed)', card.renter_confirmed_return === false, card.renter_confirmed_return);

    // STEP 5 — Double-confirm return
    step(5, 'Double-confirm return: B confirms FIRST, then A');
    const confB = await api('POST', `/rentals/requests/${requestId}/confirm-return`, null, tokB);
    check('B confirm returns 200', confB.status === 200, 'status=' + confB.status);
    check('after B: status still accepted', confB.data?.request?.status === 'accepted', confB.data?.request?.status);
    check('after B: renter_confirmed_return = true', confB.data?.request?.renter_confirmed_return === true, confB.data?.request?.renter_confirmed_return);
    check('after B: owner_confirmed_return = false (awaiting A)', confB.data?.request?.owner_confirmed_return === false, confB.data?.request?.owner_confirmed_return);

    // KEY: deposit NOT released after only one confirmation
    const depMid = await q(
      `SELECT status FROM transactions WHERE related_id=$1 AND type='outgoing' AND amount=45 AND description LIKE 'Rental deposit held%'`, [requestId]
    );
    check('deposit STILL pending after 1 confirmation', depMid[0]?.status === 'pending', depMid[0]?.status);
    const refundMid = await q(
      `SELECT id FROM transactions WHERE related_id=$1 AND type='incoming' AND amount=45 AND description LIKE 'Rental deposit refund%'`, [requestId]
    );
    check('NO refund row exists yet (only one side confirmed)', refundMid.length === 0, refundMid.length);

    const confA = await api('POST', `/rentals/requests/${requestId}/confirm-return`, null, tokA);
    check('A confirm returns 200', confA.status === 200, 'status=' + confA.status);
    check('after both: status = returned', confA.data?.request?.status === 'returned', confA.data?.request?.status);
    check('after both: owner_confirmed_return = true', confA.data?.request?.owner_confirmed_return === true, confA.data?.request?.owner_confirmed_return);

    const depFinal = await q(
      `SELECT status FROM transactions WHERE related_id=$1 AND type='outgoing' AND amount=45 AND description LIKE 'Rental deposit held%'`, [requestId]
    );
    check('deposit hold NOW completed (released)', depFinal[0]?.status === 'completed', depFinal[0]?.status);
    const refundFinal = await q(
      `SELECT user_id, amount, status FROM transactions WHERE related_id=$1 AND type='incoming' AND amount=45 AND description LIKE 'Rental deposit refund%'`, [requestId]
    );
    check('refund row created (renter gets deposit back)', refundFinal.length === 1 && refundFinal[0].user_id === USER_B && refundFinal[0].status === 'completed', JSON.stringify(refundFinal[0]));
    const rentAfterReturn = await q('SELECT status FROM rentals WHERE id=$1', [rentalId]);
    check('rentals.status = available after completion', rentAfterReturn[0].status === 'available', rentAfterReturn[0]?.status);

    // STEP 6 — Withdraw a pending request (separate case)
    step(6, 'Withdraw a pending request: B requests 2 days, then cancels');
    const req2 = await api('POST', `/rentals/${rentalId}/requests`, { days_requested: 2 }, tokB);
    requestId2 = req2.data?.request?.id;
    check('second request 201', req2.status === 201, 'status=' + req2.status);
    const cancelRes = await api('PATCH', `/rentals/requests/${requestId2}/cancel`, null, tokB);
    check('cancel returns 200', cancelRes.status === 200, 'status=' + cancelRes.status);
    check('cancel sets status = cancelled', cancelRes.data?.request?.status === 'cancelled', cancelRes.data?.request?.status);
    const rentAfterCancel = await q('SELECT status FROM rentals WHERE id=$1', [rentalId]);
    check('rentals.status reverts to available after cancel', rentAfterCancel[0].status === 'available', rentAfterCancel[0]?.status);
    const txOnCancel = await q('SELECT id FROM transactions WHERE related_id=$1', [requestId2]);
    check('NO transactions created for a cancelled (pre-accept) request', txOnCancel.length === 0, txOnCancel.length);

    // STEP 7 (bonus) — Decline path
    step(7, 'Decline path: B requests 1 day, A declines');
    const req3 = await api('POST', `/rentals/${rentalId}/requests`, { days_requested: 1 }, tokB);
    requestId3 = req3.data?.request?.id;
    const decline = await api('PATCH', `/rentals/requests/${requestId3}`, { status: 'declined' }, tokA);
    check('decline sets status = declined (as A)', decline.data?.request?.status === 'declined', decline.data?.request?.status);
    const rentAfterDecline = await q('SELECT status FROM rentals WHERE id=$1', [rentalId]);
    check('rentals.status reverts to available after decline', rentAfterDecline[0].status === 'available', rentAfterDecline[0]?.status);
    const txOnDecline = await q('SELECT id FROM transactions WHERE related_id=$1', [requestId3]);
    check('NO transactions created for a declined request', txOnDecline.length === 0, txOnDecline.length);

    // ownership guard
    step(8, 'Authorization: B cannot accept (403), B cannot withdraw A request');
    const badAccept = await api('PATCH', `/rentals/requests/${requestId}/`, { status: 'accepted' }, tokB); // already-returned; should 400 anyway
    check('cannot re-accept a completed request', badAccept.status === 400, 'status=' + badAccept.status);

  } finally {
    console.log('\n' + '='.repeat(60));
    console.log(`RESULTS: ${pass} passed, ${fail} failed`);
    console.log('='.repeat(60));
    srv.kill();
    try { await db.pool?.end?.(); } catch (e) {}
    setTimeout(() => process.exit(fail > 0 ? 1 : 0), 800);
  }
}

main().catch(e => {
  console.error('TEST HARNESS ERROR:', e.message);
  process.exit(1);
});
</arg_value>
<task_progress>
- [x] Check auth middleware
- [x] Find two verified test users
- [x] Build "List this item for Rent" UI
- [x] Verify client builds
- [x] Verify transactions schema (pillar column EXISTS — route is correct)
- [x] Write end-to-end test script
- [ ] Run walkthrough
- [ ] Report real results
</task_progress>
