const axios = require('axios');
const mysql = require('mysql2/promise');

async function testLike() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'seaku_novel'
  });

  const reviewId = '8c149170-9815-484c-a61d-ab2e3867537f';

  const [beforeRows] = await db.query('SELECT likes_count FROM reviews WHERE id = ?', [reviewId]);
  console.log("DB Likes before:", beforeRows[0].likes_count);

  const loginRes = await axios.post('http://127.0.0.1:3001/api/auth/login', {
    email: '123@123.com',
    password: '123123'
  });
  const token = loginRes.data.token;

  console.log("Sending like request...");
  await axios.post(`http://127.0.0.1:3001/api/reviews/${reviewId}/like`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const [afterRows] = await db.query('SELECT likes_count FROM reviews WHERE id = ?', [reviewId]);
  console.log("DB Likes after:", afterRows[0].likes_count);

  await db.end();
}

testLike();
