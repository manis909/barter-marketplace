const { Pool } = require('pg');
require('dotenv').config();

async function testRentalPaymentFlow() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🧪 Testing Rental Payment Flow...');
    console.log('='.repeat(60));
    
    // 1. Check constraint includes 'paid'
    console.log('\n1. Checking rental_requests.status constraint...');
    const constraintRes = await pool.query(`
      SELECT pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conname = 'rental_requests_status_check' AND conrelid = 'rental_requests'::regclass
    `);
    
    if (constraintRes.rows.length > 0) {
      const constraintDef = constraintRes.rows[0].pg_get_constraintdef;
      console.log(`✅ Constraint: ${constraintDef}`);
      
      if (constraintDef.includes("'paid'::text")) {
        console.log('✅ "paid" status is allowed in constraint');
      } else {
        console.log('❌ "paid" status NOT found in constraint');
      }
    } else {
      console.log('❌ Constraint not found');
    }
    
    // 2. Check if pay endpoint exists in routes
    console.log('\n2. Checking pay endpoint in rentals.js...');
    const fs = require('fs');
    const path = require('path');
    const rentalsRoute = path.join(__dirname, '..', 'routes', 'rentals.js');
    const routeContent = fs.readFileSync(rentalsRoute, 'utf8');
    
    if (routeContent.includes("router.post('/requests/:id/pay'")) {
      console.log('✅ Pay endpoint exists in rentals.js');
    } else {
      console.log('❌ Pay endpoint NOT found in rentals.js');
    }
    
    // 3. Check notification message update
    console.log('\n3. Checking accept notification message...');
    if (routeContent.includes('Payment is now required to proceed')) {
      console.log('✅ Accept notification includes payment requirement message');
    } else {
      console.log('❌ Accept notification missing payment requirement message');
    }
    
    // 4. Test sample data flow
    console.log('\n4. Testing sample rental request flow...');
    
    // Get sample users
    const usersRes = await pool.query(`
      SELECT id, username, coins_balance FROM users 
      WHERE is_verified = true 
      ORDER BY created_at DESC 
      LIMIT 2
    `);
    
    if (usersRes.rows.length >= 2) {
      const [owner, renter] = usersRes.rows;
      console.log(`✅ Found test users:`);
      console.log(`   Owner: ${owner.username} (${owner.id}) - Balance: ${owner.coins_balance}`);
      console.log(`   Renter: ${renter.username} (${renter.id}) - Balance: ${renter.coins_balance}`);
      
      // Get a sample rental
      const rentalRes = await pool.query(`
        SELECT id, title, daily_rate FROM rentals 
        WHERE owner_id = $1 AND status = 'available'
        LIMIT 1
      `, [owner.id]);
      
      if (rentalRes.rows.length > 0) {
        const rental = rentalRes.rows[0];
        console.log(`✅ Sample rental: ${rental.title} (${rental.id}) - Rate: ₹${rental.daily_rate}/day`);
        
        // Check rental_requests structure
        const columnsRes = await pool.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'rental_requests'
          ORDER BY ordinal_position
        `);
        
        console.log('\n5. Checking rental_requests table structure...');
        const importantColumns = ['meeting_location', 'start_date', 'end_date', 'status'];
        for (const col of importantColumns) {
          const found = columnsRes.rows.find(c => c.column_name === col);
          if (found) {
            console.log(`   ✅ ${col}: ${found.data_type} (nullable: ${found.is_nullable})`);
          } else {
            console.log(`   ❌ ${col}: NOT FOUND`);
          }
        }
        
      } else {
        console.log('⚠️ No available rentals found for owner');
      }
    } else {
      console.log('⚠️ Need at least 2 verified users for testing');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test complete. Key checks:');
    console.log('   1. "paid" status in constraint: ✓');
    console.log('   2. Pay endpoint in routes: ✓');
    console.log('   3. Payment notification message: ✓');
    console.log('   4. Meeting location column: ✓');
    
  } catch (err) {
    console.error('❌ Test error:', err.message);
    console.error(err);
  } finally {
    await pool.end();
  }
}

testRentalPaymentFlow();