require('dotenv').config({ path: './.env' });
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const http = require('http');

const base = 'http://localhost:5001';
const borrowerId = '3f9df140-b30a-4ae3-b18d-9b90f916e1ee';
const ownerId = 'd8eae0f6-de89-4640-a16a-d37fe11777ed';
const adminId = '5a10141b-67e5-4ceb-8c7f-82470d41c537';
const listingId = 'c2f00115-a301-48fb-ac14-d6cc62ea9098';
const secret = process.env.JWT_SECRET;

function requestJson(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(base + url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data || '{}') });
        } catch (err) {
          resolve({ status: res.statusCode, body: data || {} });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function requestMultipart(method, url, fields, filePath, token) {
  return new Promise((resolve, reject) => {
    const boundary = `----NodeBoundary${Date.now()}`;
    const fileBuffer = fs.readFileSync(filePath);
    const chunks = [];

    for (const [name, value] of Object.entries(fields)) {
      const s = `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${String(value)}\r\n`;
      chunks.push(Buffer.from(s, 'utf8'));
    }

    const fileName = path.basename(filePath);
    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="screenshot"; filename="${fileName}"\r\nContent-Type: image/png\r\n\r\n`;
    chunks.push(Buffer.from(fileHeader, 'utf8'));
    chunks.push(fileBuffer);
    chunks.push(Buffer.from('\r\n', 'utf8'));
    chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);

    const req = http.request(base + url, {
      method,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Length': totalLength,
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data || '{}') });
        } catch (err) {
          resolve({ status: res.statusCode, body: data || {} });
        }
      });
    });

    req.on('error', reject);
    for (const chunk of chunks) req.write(chunk);
    req.end();
  });
}

async function main() {
  const borrowerToken = jwt.sign({ userId: borrowerId }, secret, { expiresIn: '7d' });
  const ownerToken = jwt.sign({ userId: ownerId }, secret, { expiresIn: '7d' });
  const adminToken = jwt.sign({ userId: adminId }, secret, { expiresIn: '7d' });

  const start = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();

  console.log('STAGE 1: CREATE BOOKING');
  const createRes = await requestJson('POST', '/api/rental-bookings', {
    rental_listing_id: listingId,
    start_datetime: start,
    end_datetime: end,
    meeting_location: 'Main Gate',
  }, borrowerToken);
  console.log(JSON.stringify(createRes, null, 2));
  const bookingId = createRes.body?.booking?.id;
  if (!bookingId) throw new Error('No booking id returned');

  console.log('STAGE 2: OWNER ACCEPTS BOOKING');
  const acceptRes = await requestJson('PATCH', `/api/rental-bookings/${bookingId}/status`, { status: 'accepted' }, ownerToken);
  console.log(JSON.stringify(acceptRes, null, 2));

  console.log('STAGE 3: PAYMENT QR + UPLOAD + ADMIN VERIFY');
  const qrRes = await requestJson('GET', `/api/rental-bookings/${bookingId}/payment-qr`, null, borrowerToken);
  console.log(JSON.stringify(qrRes, null, 2));

  const tmpPath = path.join(__dirname, 'tmp-rental-payment.png');
  fs.writeFileSync(tmpPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAF', 'base64'));
  const uploadRes = await requestMultipart('POST', `/api/rental-bookings/${bookingId}/upload-payment`, { utr: 'UTRVERIFY123' }, tmpPath, borrowerToken);
  console.log(JSON.stringify(uploadRes, null, 2));

  const confirmRes = await requestJson('PATCH', `/api/rental-bookings/${bookingId}/confirm-payment`, {}, adminToken);
  console.log(JSON.stringify(confirmRes, null, 2));

  console.log('STAGE 4: PICKUP CONFIRMATION');
  const pickupBorrower = await requestJson('POST', `/api/rental-bookings/${bookingId}/confirm-pickup`, {}, borrowerToken);
  console.log(JSON.stringify(pickupBorrower, null, 2));
  const pickupOwner = await requestJson('POST', `/api/rental-bookings/${bookingId}/confirm-pickup`, {}, ownerToken);
  console.log(JSON.stringify(pickupOwner, null, 2));

  console.log('STAGE 5: RETURN + DISPUTE FLOW');
  const returnRes = await requestJson('POST', `/api/rental-bookings/${bookingId}/confirm-return`, { problem: 'Damage report during return' }, borrowerToken);
  console.log(JSON.stringify(returnRes, null, 2));

  const detailRes = await requestJson('GET', `/api/rental-bookings/${bookingId}`, null, ownerToken);
  console.log('DETAIL', JSON.stringify(detailRes, null, 2));

  fs.unlinkSync(tmpPath);
}

main().catch((err) => {
  console.error('VERIFICATION_SCRIPT_ERROR');
  console.error(err && (err.stack || err.message || String(err)));
  process.exit(1);
});
