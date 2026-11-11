import puppeteer from 'puppeteer';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function runTest() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: '', database: 'seaku_novel',
  });
  const [users] = await connection.query('SELECT * FROM users WHERE role="admin" OR role="author" LIMIT 1');
  const user = users[0];

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  try {
    await page.goto(`http://localhost:5173/login`);
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', user.email);
    const hash = await bcrypt.hash('testpass123', 10);
    await connection.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
    await page.type('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    await page.goto(`http://localhost:5173/write`);
    await new Promise(r => setTimeout(r, 2000));
    
    const html = await page.evaluate(() => document.body.innerHTML);
    console.log('HTML CONTENT:', html.substring(0, 5000)); // Only output a bit to avoid overwhelming log
    
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await browser.close();
    await connection.end();
  }
}
runTest();
