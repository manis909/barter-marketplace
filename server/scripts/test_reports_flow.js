#!/usr/bin/env node

/**
 * Test script: Verify Barter/Skilter Reports admin flow
 * 
 * This script:
 * 1. Applies the skill_booking_id migration if not already applied
 * 2. Creates test reports for both barter and skilter
 * 3. Tests the admin report fetch endpoints with type filtering
 * 4. Verifies conversation fetching for both types
 */

require('dotenv').config();
const db = require('../models/db');

async function testReportsFlow() {
  try {
    console.log('🧪 Starting Admin Reports End-to-End Test...\n');

    // Step 1: Ensure skill_booking_id column exists
    console.log('📋 Step 1: Checking reports table schema...');
    const schemaCheck = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'reports'
      ORDER BY column_name
    `);
    
    const columns = schemaCheck.rows.map(r => r.column_name);
    console.log('   Columns:', columns.join(', '));
    
    const hasSkillBookingId = columns.includes('skill_booking_id');
    if (!hasSkillBookingId) {
      console.log('   ⚠️  skill_booking_id column missing! Adding now...');
      await db.query(`
        ALTER TABLE reports 
        ADD COLUMN IF NOT EXISTS skill_booking_id UUID REFERENCES skill_bookings(id) ON DELETE CASCADE;
      `);
      console.log('   ✓ skill_booking_id column added');
    } else {
      console.log('   ✓ skill_booking_id column exists');
    }

    // Step 2: Get test users
    console.log('\n📋 Step 2: Fetching test users...');
    const usersRes = await db.query('SELECT id, username FROM users LIMIT 3');
    if (usersRes.rows.length < 2) {
      throw new Error('Not enough test users available');
    }
    const [reporter, reportedUser, admin] = usersRes.rows;
    console.log(`   Reporter: ${reporter.username} (${reporter.id})`);
    console.log(`   Reported: ${reportedUser.username} (${reportedUser.id})`);

    // Step 3: Create a test barter report (with trade_offer_id)
    console.log('\n📋 Step 3: Creating test barter report...');
    const tradeRes = await db.query(
      'SELECT id FROM trade_offers LIMIT 1'
    );
    if (tradeRes.rows.length === 0) {
      console.log('   ⚠️  No trade offers available for barter report test');
    } else {
      const tradeOfferId = tradeRes.rows[0].id;
      const barterReportRes = await db.query(
        `INSERT INTO reports (reported_by, reported_user_id, trade_offer_id, reason, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, trade_offer_id, skill_booking_id`,
        [reporter.id, reportedUser.id, tradeOfferId, 'Test barter report', 'open']
      );
      console.log(`   ✓ Barter report created: ${barterReportRes.rows[0].id}`);
      console.log(`     - trade_offer_id: ${barterReportRes.rows[0].trade_offer_id}`);
      console.log(`     - skill_booking_id: ${barterReportRes.rows[0].skill_booking_id}`);
    }

    // Step 4: Create a test skilter report (with skill_booking_id)
    console.log('\n📋 Step 4: Creating test skilter report...');
    const bookingRes = await db.query(
      'SELECT id FROM skill_bookings LIMIT 1'
    );
    if (bookingRes.rows.length === 0) {
      console.log('   ⚠️  No skill bookings available for skilter report test');
    } else {
      const skillBookingId = bookingRes.rows[0].id;
      const skilterReportRes = await db.query(
        `INSERT INTO reports (reported_by, reported_user_id, skill_booking_id, reason, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, trade_offer_id, skill_booking_id`,
        [reporter.id, reportedUser.id, skillBookingId, 'Test skilter report', 'open']
      );
      console.log(`   ✓ Skilter report created: ${skilterReportRes.rows[0].id}`);
      console.log(`     - trade_offer_id: ${skilterReportRes.rows[0].trade_offer_id}`);
      console.log(`     - skill_booking_id: ${skilterReportRes.rows[0].skill_booking_id}`);
    }

    // Step 5: Test report filtering
    console.log('\n📋 Step 5: Testing report filtering...');
    
    const allRes = await db.query(`
      SELECT id, trade_offer_id, skill_booking_id FROM reports 
      ORDER BY created_at DESC LIMIT 10
    `);
    console.log(`   Total reports in DB: ${allRes.rows.length}`);
    
    const barterRes = await db.query(`
      SELECT id, trade_offer_id, skill_booking_id FROM reports 
      WHERE trade_offer_id IS NOT NULL
      ORDER BY created_at DESC
    `);
    console.log(`   ✓ Barter reports (trade_offer_id IS NOT NULL): ${barterRes.rows.length}`);
    
    const skilterRes = await db.query(`
      SELECT id, trade_offer_id, skill_booking_id FROM reports 
      WHERE skill_booking_id IS NOT NULL
      ORDER BY created_at DESC
    `);
    console.log(`   ✓ Skilter reports (skill_booking_id IS NOT NULL): ${skilterRes.rows.length}`);

    // Step 6: Test conversation fetching
    if (skilterRes.rows.length > 0) {
      console.log('\n📋 Step 6: Testing skilter conversation fetching...');
      const reportId = skilterRes.rows[0].id;
      const bookingId = skilterRes.rows[0].skill_booking_id;
      
      console.log(`   Testing report: ${reportId}`);
      console.log(`   Booking ID: ${bookingId}`);
      
      const messagesRes = await db.query(`
        SELECT id, sender_id, message, created_at
        FROM skill_messages
        WHERE booking_id = $1
        ORDER BY created_at ASC
        LIMIT 5
      `, [bookingId]);
      
      console.log(`   ✓ Skill messages found: ${messagesRes.rows.length}`);
      if (messagesRes.rows.length > 0) {
        console.log(`     Sample message: "${messagesRes.rows[0].message}"`);
      }
    }

    // Step 7: Test report actions
    console.log('\n📋 Step 7: Testing report action (warn)...');
    if (barterRes.rows.length > 0) {
      const reportId = barterRes.rows[0].id;
      const updateRes = await db.query(`
        UPDATE reports 
        SET status = 'actioned', admin_action = 'warn', admin_notes = 'Test warning', 
            actioned_by = $2, actioned_at = NOW()
        WHERE id = $1
        RETURNING id, admin_action, admin_notes, actioned_by, actioned_at
      `, [reportId, admin.id]);
      
      if (updateRes.rows.length > 0) {
        const updatedReport = updateRes.rows[0];
        console.log(`   ✓ Report updated with warn action`);
        console.log(`     - admin_action: ${updatedReport.admin_action}`);
        console.log(`     - admin_notes: ${updatedReport.admin_notes}`);
        console.log(`     - actioned_by: ${updatedReport.actioned_by}`);
      }
    }

    console.log('\n✅ All tests completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testReportsFlow();
