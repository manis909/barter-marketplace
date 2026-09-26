const db = require('./server/models/db');

async function testRentalRequests() {
  try {
    const result = await db.query(`
      SELECT id, title, status, payment_status 
      FROM rental_requests 
      WHERE status = 'accepted' AND payment_status = 'unpaid' 
      LIMIT 1
    `);
    
    console.log('Test rental request:', result.rows[0] || 'None found');
    
    // Also check the uploads directory exists
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, 'server', 'uploads', 'rental-payment-screenshots');
    const dirExists = fs.existsSync(uploadsDir);
    console.log('Uploads directory exists:', dirExists, 'at', uploadsDir);
    
    if (!dirExists) {
      console.log('Creating uploads directory...');
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testRentalRequests();