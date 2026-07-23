const db = require('./models/db');

(async () => {
  try {
    const res = await db.query(
      'INSERT INTO items (owner_id, title, description, category, image_urls) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [1, 'Debug item', 'debug', 'Books', ['https://example.com/test.png']]
    );
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.log('ERROR_MESSAGE=' + err.message);
    console.log('ERROR_CODE=' + err.code);
    console.log('ERROR_DETAIL=' + (err.detail || ''));
    console.log('ERROR_HINT=' + (err.hint || ''));
    console.log('ERROR_TABLE=' + (err.table || ''));
    console.log('ERROR_CONSTRAINT=' + (err.constraint || ''));
  }
})();
