require('dotenv').config();
const db = require('../models/db');

async function testPayoutEscrowFlow() {
  console.log('=== STARTING PAYOUT ESCROW FLOW AUTOMATED TEST ===\n');

  let client;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      client = await db.getClient();
      break;
    } catch (err) {
      console.log(`Connection attempt ${attempt} failed: ${err.message}. Retrying...`);
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  try {
    // 1. Fetch or create test user accounts (owner, renter, admin)
    const usersRes = await client.query('SELECT id, email, is_admin FROM users LIMIT 10');
    console.log(`Found ${usersRes.rows.length} existing users.`);
    
    let adminUser = usersRes.rows.find(u => u.is_admin === true) || usersRes.rows[0];
    let ownerUser = usersRes.rows.find(u => u.id !== adminUser.id) || usersRes.rows[1] || usersRes.rows[0];
    let renterUser = usersRes.rows.find(u => u.id !== adminUser.id && u.id !== ownerUser.id) || usersRes.rows[2] || usersRes.rows[0];

    // Ensure we have a mock listing
    const listingRes = await client.query('SELECT id, owner_id FROM rental_listings LIMIT 1');
    let listingId = listingRes.rows[0]?.id;
    if (listingRes.rows[0]?.owner_id) {
      ownerUser = { id: listingRes.rows[0].owner_id };
    }

    console.log(`Test users -> Admin: ${adminUser?.id}, Owner: ${ownerUser?.id}, Renter: ${renterUser?.id}`);

    const randomDays = Math.floor(Math.random() * 500) + 100;
    // Create a mock rental booking
    const insertBooking = await client.query(`
      INSERT INTO rental_bookings (
        rental_listing_id, borrower_id, owner_id, start_datetime, end_datetime,
        agreed_total_amount, deposit_amount,
        status, payment_status, payout_status
      ) VALUES ($1, $2, $3, NOW() + (${randomDays} || ' days')::interval, NOW() + (${randomDays + 2} || ' days')::interval, 200, 50, 'pending', 'unpaid', 'pending')
      RETURNING *
    `, [listingId || null, renterUser.id, ownerUser.id]);

    const booking = insertBooking.rows[0];
    console.log(`[PASS] 1. Created test rental booking #${booking.id}`);

    // 2. Owner accepts booking with UPI ID and Account Holder Name
    const testUpi = 'seller.test@okaxis';
    const testName = 'John Seller Doe';
    
    await client.query(`
      INSERT INTO seller_payout_details (user_id, entity_type, entity_id, upi_id, account_holder_name)
      VALUES ($1, 'rental_booking', $2, $3, $4)
      ON CONFLICT (entity_type, entity_id)
      DO UPDATE SET upi_id = EXCLUDED.upi_id, account_holder_name = EXCLUDED.account_holder_name, updated_at = NOW()
    `, [ownerUser.id, booking.id, testUpi, testName]);

    await client.query(`UPDATE rental_bookings SET status = 'accepted' WHERE id = $1`, [booking.id]);
    console.log(`[PASS] 2. Owner accepted booking #${booking.id} and stored payout details (${testUpi}, ${testName})`);

    // Verify seller_payout_details in DB
    const payoutDetailRes = await client.query(
      `SELECT * FROM seller_payout_details WHERE entity_type = 'rental_booking' AND entity_id = $1`,
      [booking.id]
    );
    if (payoutDetailRes.rows[0]?.upi_id !== testUpi) {
      throw new Error(`Payout details not saved correctly! Expected ${testUpi}, got ${payoutDetailRes.rows[0]?.upi_id}`);
    }
    console.log(`[PASS] 3. Verified seller_payout_details record in database.`);

    // 3. Renter pays -> payment_status = 'pending_verification'
    await client.query(`
      UPDATE rental_bookings
      SET payment_status = 'pending_verification',
          payment_reference = 'UTR-BUYER-998877'
      WHERE id = $1
    `, [booking.id]);
    console.log(`[PASS] 4. Renter submitted payment reference UTR-BUYER-998877`);

    // 4. Admin query to view pending payments with seller payout info
    const adminQuery = await client.query(`
      SELECT rb.*,
             spd.upi_id AS seller_payout_upi,
             spd.account_holder_name AS seller_payout_name
      FROM rental_bookings rb
      LEFT JOIN seller_payout_details spd
        ON spd.entity_type = 'rental_booking' AND spd.entity_id = rb.id
      WHERE rb.id = $1
    `, [booking.id]);

    const adminView = adminQuery.rows[0];
    if (adminView.seller_payout_upi !== testUpi || adminView.seller_payout_name !== testName) {
      throw new Error(`Admin view missing seller payout details! Got: ${JSON.stringify(adminView)}`);
    }
    console.log(`[PASS] 5. Admin query correctly joins seller payout details: UPI=${adminView.seller_payout_upi}, Name=${adminView.seller_payout_name}`);

    // 5. Admin verifies buyer payment -> payment_status = 'paid', payout_status = 'pending_payout'
    await client.query(`
      UPDATE rental_bookings
      SET payment_status = 'paid',
          payout_status = 'pending_payout'
      WHERE id = $1
    `, [booking.id]);
    console.log(`[PASS] 6. Admin verified buyer payment. Status set to payment_status='paid', payout_status='pending_payout'`);

    // 6. Admin marks payout as sent with UTR
    const payoutUtr = 'UTR-PAYOUT-11223344';
    await client.query(`
      UPDATE rental_bookings
      SET payout_status = 'paid_out',
          payout_sent_at = NOW(),
          payout_utr = $1,
          payout_notes = 'Sent via GPay'
      WHERE id = $2
    `, [payoutUtr, booking.id]);

    const finalBookingRes = await client.query(`SELECT * FROM rental_bookings WHERE id = $1`, [booking.id]);
    const finalBooking = finalBookingRes.rows[0];

    if (finalBooking.payout_status !== 'paid_out' || finalBooking.payout_utr !== payoutUtr || !finalBooking.payout_sent_at) {
      throw new Error(`Final payout state incorrect! ${JSON.stringify(finalBooking)}`);
    }
    console.log(`[PASS] 7. Payout confirmed! payout_status='${finalBooking.payout_status}', payout_utr='${finalBooking.payout_utr}', payout_sent_at='${finalBooking.payout_sent_at}'`);

    // Clean up test booking
    await client.query(`DELETE FROM seller_payout_details WHERE entity_type = 'rental_booking' AND entity_id = $1`, [booking.id]);
    await client.query(`DELETE FROM rental_bookings WHERE id = $1`, [booking.id]);
    console.log(`[PASS] 8. Cleaned up test data.`);

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    process.exit(process.exitCode || 0);
  }
}

testPayoutEscrowFlow();
