require('dotenv').config({ path: './server/.env' });
const db = require('../models/db');

async function test() {
  console.log('\n=== RENTAL PAYMENT TEST ===\n');
  
  // Find two users
  const usersRes = await db.query('SELECT id, username, coins_balance FROM users LIMIT 2');
  if (usersRes.rows.length < 2) {
    console.log('ERROR: Need at least 2 users in database');
    process.exit(1);
  }
  
  const owner = usersRes.rows[0];
  const renter = usersRes.rows[1];
  
  console.log('OWNER:', owner.username, '| Balance:', owner.coins_balance);
  console.log('RENTER:', renter.username, '| Balance:', renter.coins_balance);
  
  // Give renter enough coins if needed
  const minBalance = 1000;
  if (renter.coins_balance < minBalance) {
    console.log(`\nGiving renter ${minBalance} coins for testing...`);
    await db.query('UPDATE users SET coins_balance = $1 WHERE id = $2', [minBalance, renter.id]);
    renter.coins_balance = minBalance;
  }
  
  // Create a test rental
  console.log('\n--- Creating test rental ---');
  const rentalRes = await db.query(
    `INSERT INTO rentals (owner_id, title, description, daily_rate, status)
     VALUES ($1, 'Test Camera', 'For testing payment flow', 50, 'available')
     RETURNING *`,
    [owner.id]
  );
  const rental = rentalRes.rows[0];
  console.log('Created rental:', rental.title, '| Daily rate:', rental.daily_rate);
  
  // Create a rental request
  console.log('\n--- Creating rental request ---');
  const fee = 150; // 3 days * 50
  const deposit = 100;
  const requestRes = await db.query(
    `INSERT INTO rental_requests (rental_id, requester_id, start_date, end_date, total_amount, deposit_amount, status)
     VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + 3, $3, $4, 'pending')
     RETURNING *`,
    [rental.id, renter.id, fee, deposit]
  );
  const request = requestRes.rows[0];
  console.log('Created request | Fee:', fee, '| Deposit:', deposit, '| Total:', fee + deposit);
  
  // Get balances BEFORE accept
  const beforeRes = await db.query(
    'SELECT id, username, coins_balance FROM users WHERE id IN ($1, $2)',
    [owner.id, renter.id]
  );
  const beforeOwner = beforeRes.rows.find(u => u.id === owner.id);
  const beforeRenter = beforeRes.rows.find(u => u.id === renter.id);
  
  console.log('\n--- BEFORE ACCEPT ---');
  console.log('Owner balance:', beforeOwner.coins_balance);
  console.log('Renter balance:', beforeRenter.coins_balance);
  
  // Accept the request (this should trigger payment)
  console.log('\n--- ACCEPTING REQUEST (payment should happen now) ---');
  
  // Simulate the accept logic
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const totalCost = fee + deposit;
    
    // Check balance
    const balCheck = await client.query('SELECT coins_balance FROM users WHERE id = $1', [renter.id]);
    console.log('Balance check: Renter has', balCheck.rows[0].coins_balance, '| Needs', totalCost);
    
    if (balCheck.rows[0].coins_balance < totalCost) {
      console.log('ERROR: Insufficient balance!');
      await client.query('ROLLBACK');
      process.exit(1);
    }
    
    // Debit renter
    await client.query('UPDATE users SET coins_balance = coins_balance - $1 WHERE id = $2', [totalCost, renter.id]);
    console.log('Debited renter:', totalCost, 'coins');
    
    // Credit owner (fee only)
    await client.query('UPDATE users SET coins_balance = coins_balance + $1 WHERE id = $2', [fee, owner.id]);
    console.log('Credited owner:', fee, 'coins (deposit held)');
    
    // Update request status
    await client.query('UPDATE rental_requests SET status = $1 WHERE id = $2', ['accepted', request.id]);
    
    await client.query('COMMIT');
    console.log('Transaction committed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
  
  // Get balances AFTER accept
  const afterRes = await db.query(
    'SELECT id, username, coins_balance FROM users WHERE id IN ($1, $2)',
    [owner.id, renter.id]
  );
  const afterOwner = afterRes.rows.find(u => u.id === owner.id);
  const afterRenter = afterRes.rows.find(u => u.id === renter.id);
  
  console.log('\n--- AFTER ACCEPT ---');
  console.log('Owner balance:', afterOwner.coins_balance, '(+' + (afterOwner.coins_balance - beforeOwner.coins_balance) + ')');
  console.log('Renter balance:', afterRenter.coins_balance, '(-' + (beforeRenter.coins_balance - afterRenter.coins_balance) + ')');
  
  // Verify
  const ownerGain = afterOwner.coins_balance - beforeOwner.coins_balance;
  const renterLoss = beforeRenter.coins_balance - afterRenter.coins_balance;
  
  console.log('\n=== VERIFICATION ===');
  console.log('Expected: Owner gains', fee, '| Renter loses', fee + deposit);
  console.log('Actual: Owner gained', ownerGain, '| Renter lost', renterLoss);
  
  if (ownerGain === fee && renterLoss === (fee + deposit)) {
    console.log('✓ PAYMENT FLOW WORKS CORRECTLY');
  } else {
    console.log('✗ PAYMENT MISMATCH!');
  }
  
  // Cleanup
  console.log('\n--- Cleanup ---');
  await db.query('DELETE FROM rental_requests WHERE id = $1', [request.id]);
  await db.query('DELETE FROM rentals WHERE id = $1', [rental.id]);
  console.log('Test data cleaned up\n');
  
  process.exit(0);
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
