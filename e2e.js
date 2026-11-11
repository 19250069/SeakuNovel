import puppeteer from 'puppeteer';
import mysql from 'mysql2/promise';

async function runTest() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: '', database: 'seaku_novel',
  });

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  try {
    console.log('1. Logging in...');
    await page.goto('http://localhost:5173/login');
    await page.type('input[type="email"]', 'author@example.com'); 
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    console.log('2. Opening a novel write page...');
    const [novels] = await connection.query('SELECT * FROM novels WHERE author_id = (SELECT id FROM users WHERE email="author@example.com") LIMIT 1');
    const novelId = novels[0].id;
    await page.goto(`http://localhost:5173/write/${novelId}`);
    
    console.log('3. Waiting for Write UI...');
    await page.waitForSelector('.prose-editor');
    
    console.log('4. Typing content...');
    await page.click('.prose-editor');
    await page.keyboard.type('SEAKUNOVEL_REAL_CONTENT_TEST_987654321');
    
    console.log('5. Clicking Save...');
    let requestPayload = null;
    page.on('request', req => {
      if (req.method() === 'PUT' && req.url().includes('/chapters/')) {
        requestPayload = req.postData();
        console.log('REQUEST PAYLOAD:', requestPayload);
      }
    });
    
    const [saveBtn] = await page.$x("//button[contains(., 'Simpan')]");
    if (saveBtn) await saveBtn.click();
    await page.waitForResponse(res => res.url().includes('/chapters/') && res.status() === 200);
    
    console.log('6. Querying DB immediately...');
    const [chapters] = await connection.query('SELECT * FROM chapters ORDER BY updated_at DESC LIMIT 1');
    console.log('DATABASE STORED:', chapters[0].content);
    const chapterId = chapters[0].id;
    
    console.log('7. Publishing...');
    const [pubBtn] = await page.$x("//button[contains(., 'Terbitkan')]");
    if (pubBtn) await pubBtn.click();
    await page.waitForResponse(res => res.url().includes('/publish') && res.status() === 200);
    
    console.log('8. Going to reader...');
    await page.goto(`http://localhost:5173/read/${chapterId}`);
    await page.waitForSelector('.prose', { timeout: 5000 }).catch(()=>console.log('No .prose found'));
    
    const domContent = await page.evaluate(() => {
      const el = document.querySelector('.prose');
      return el ? el.innerHTML : 'NULL';
    });
    console.log('DOM OUTPUT:', domContent);
    
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
    await connection.end();
  }
}
runTest();
