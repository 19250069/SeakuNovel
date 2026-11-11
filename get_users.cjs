const mysql = require('mysql2/promise');
async function run() {
  const connection = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: '', database: 'seaku_novel' });
  const [users] = await connection.query('SELECT email, role, username FROM users');
  console.log(users);
  process.exit(0);
}
run();
