import puppeteer from 'puppeteer';
import mysql from 'mysql2/promise';

async function runTest() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: '', database: 'seaku_novel',
  });
  const [users] = await connection.query('SELECT * FROM users WHERE role="admin" OR role="author" LIMIT 1');
  const user = users[0];

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  try {
    console.log('\n--- 1. LOGIN ---');
    await page.goto(`http://localhost:5173/login`);
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', user.email);
    await page.type('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    console.log('\n--- 2. OPEN NOVEL ---');
    await page.goto(`http://localhost:5173/write`);
    await page.waitForXPath("//button[contains(., 'Tulis / Edit')] | //button[contains(., 'Buat Novel Baru')]", { timeout: 10000 });
    const [tulisBtn] = await page.$x("//button[contains(., 'Tulis / Edit')]");
    if (tulisBtn) await tulisBtn.click();
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('\n--- 3. CREATE CHAPTER ---');
    await page.waitForXPath("//button[contains(., 'Bab Baru')]", { timeout: 10000 });
    const [newBtn] = await page.$x("//button[contains(., 'Bab Baru')]");
    await newBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('\n--- 4. TYPE CONTENT ---');
    await page.click('.prose-editor');
    await page.keyboard.type('SEAKUNOVEL_PUBLISH_WITHOUT_SAVE');
    
    console.log('\n--- 5. CLICK PUBLISH WITHOUT SAVING ---');
    const [pubBtn] = await page.$x("//button[contains(., 'Terbitkan')]");
    await pubBtn.click();
    await page.waitForResponse(res => res.url().includes('/publish') && res.status() === 200);
    
    console.log('\n--- 6. VERIFY DB AFTER PUBLISH ---');
    const [chapters] = await connection.query('SELECT * FROM chapters ORDER BY updated_at DESC LIMIT 1');
    console.log('DATABASE STORED:', chapters[0].content);
    
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await browser.close();
    await connection.end();
  }
}
runTest();
