require('dotenv').config();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runTest() {
  try {
    // 1. Find a trade to use for testing
    const tradeRes = await pool.query(
      `SELECT id, sender_id, receiver_id, status FROM trade_offers LIMIT 1`
    );
    if (tradeRes.rows.length === 0) {
      console.error('No trades found in the DB to test with.');
      return;
    }
    const trade = tradeRes.rows[0];
    console.log(`Using Trade ID: ${trade.id} for testing.`);
    console.log(`Sender ID: ${trade.sender_id}, Receiver ID: ${trade.receiver_id}`);

    // Reset trade status to 'accepted' and proof flags to false/proof_pending
    await pool.query(
      `UPDATE trade_offers
       SET status = 'accepted',
           sender_proof_submitted = false,
           receiver_proof_submitted = false,
           proof_status = 'proof_pending'
       WHERE id = $1`,
      [trade.id]
    );
    console.log('Trade reset to status="accepted", proof_status="proof_pending".');

    // Generate JWT tokens
    const senderToken = jwt.sign({ userId: trade.sender_id }, process.env.JWT_SECRET);
    const receiverToken = jwt.sign({ userId: trade.receiver_id }, process.env.JWT_SECRET);
    
    // Find an admin user
    const adminRes = await pool.query(`SELECT id FROM users WHERE is_admin = true LIMIT 1`);
    if (adminRes.rows.length === 0) {
      throw new Error('No admin user found in database to sign admin token');
    }
    const adminId = adminRes.rows[0].id;
    const adminToken = jwt.sign({ userId: adminId }, process.env.JWT_SECRET);

    console.log('Tokens generated successfully.');

    // Helper to send proof
    async function submitProof(token, role) {
      console.log(`Submitting proof for ${role}...`);
      const form = new FormData();
      const blob = new Blob(['dummy content'], { type: 'image/png' });
      form.append('proof_images', blob, 'test-proof.png');
      form.append('note', `Proof from ${role}`);

      const res = await fetch(`http://127.0.0.1:5000/api/trades/${trade.id}/proof`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to submit proof for ${role}: ${res.status} ${errText}`);
      }

      const json = await res.json();
      console.log(`Proof submitted successfully for ${role}. Response:`, json);
      return json;
    }

    // 2. Submit sender proof
    await submitProof(senderToken, 'sender');

    // Check trade state after sender proof
    let check = await pool.query('SELECT status, sender_proof_submitted, receiver_proof_submitted, proof_status FROM trade_offers WHERE id = $1', [trade.id]);
    console.log('After Sender Proof State:', check.rows[0]);

    // 3. Submit receiver proof
    await submitProof(receiverToken, 'receiver');

    // Check trade state after receiver proof
    check = await pool.query('SELECT status, sender_proof_submitted, receiver_proof_submitted, proof_status FROM trade_offers WHERE id = $1', [trade.id]);
    console.log('After Both Proofs State (expect awaiting_admin_verification):', check.rows[0]);

    // 4. Verify trade by admin
    console.log('Verifying trade as admin...');
    const verifyRes = await fetch(`http://127.0.0.1:5000/api/trades/${trade.id}/verify`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!verifyRes.ok) {
      const errText = await verifyRes.text();
      throw new Error(`Failed to verify trade by admin: ${verifyRes.status} ${errText}`);
    }

    const verifyJson = await verifyRes.json();
    console.log('Trade verified by admin. Response:', verifyJson);

    // Final check
    check = await pool.query('SELECT status, sender_proof_submitted, receiver_proof_submitted, proof_status FROM trade_offers WHERE id = $1', [trade.id]);
    console.log('Final DB State (expect completed):', check.rows[0]);

  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    await pool.end();
  }
}

runTest();
