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
    console.log('1. Logging in via UI...');
    await page.goto(`http://localhost:5173/login`);
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', user.email);
    const hash = await bcrypt.hash('testpass123', 10);
    await connection.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
    await page.type('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    console.log('2. Opening a novel write page...');
    const [novels] = await connection.query('SELECT id FROM novels WHERE author_id = ? LIMIT 1', [user.id]);
    if (novels.length === 0) {
      await page.goto(`http://localhost:5173/write`);
      const [createBtn] = await page.$x("//button[contains(., 'Buat Novel Baru')]");
      if(createBtn) await createBtn.click();
      await page.waitForSelector('input[placeholder="Judul Novel"]');
      await page.type('input[placeholder="Judul Novel"]', 'Test Novel');
      await page.type('textarea', 'Synopsis');
      const [simpanNovel] = await page.$x("//button[contains(., 'Simpan & Lanjutkan')]");
      await simpanNovel.click();
      await new Promise(r => setTimeout(r, 2000));
    } else {
      await page.goto(`http://localhost:5173/write`);
      await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log('3. Waiting for Write UI (Bab Baru button)...');
    await page.waitForXPath("//button[contains(., 'Bab Baru')]", { timeout: 10000 });
    
    const [newBtn] = await page.$x("//button[contains(., 'Bab Baru')]");
    if (newBtn) {
       await newBtn.click();
       await new Promise(r => setTimeout(r, 1000));
    }
    
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
    const novelId = chapters[0].novel_id;
    
    console.log('7. Publishing...');
    const [pubBtn] = await page.$x("//button[contains(., 'Terbitkan')]");
    if (pubBtn) await pubBtn.click();
    await page.waitForResponse(res => res.url().includes('/publish') && res.status() === 200);
    
    console.log('8. Going to reader...');
    await page.goto(`http://localhost:5173/read/${novelId}/${chapterId}`);
    
    console.log('Waiting for .prose-reader');
    await page.waitForSelector('.prose-reader', { timeout: 5000 }).catch(()=>console.log('No .prose-reader found'));
    
    const domContent = await page.evaluate(() => {
      const el = document.querySelector('.prose-reader');
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
