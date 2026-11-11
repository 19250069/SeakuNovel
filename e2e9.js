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
    console.log('\n--- 1. LOGIN ---');
    await page.goto(`http://localhost:5173/login`);
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', user.email);
    const hash = await bcrypt.hash('testpass123', 10);
    await connection.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
    await page.type('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    console.log('\n--- 2. OPEN NOVEL ---');
    await page.goto(`http://localhost:5173/write`);
    
    const [tulisBtn] = await page.$x("//button[contains(., 'Tulis / Edit')]");
    if (tulisBtn) {
      await tulisBtn.click();
    } else {
      const [createBtn] = await page.$x("//button[contains(., 'Buat Novel Baru')]");
      await createBtn.click();
      await page.waitForSelector('input[placeholder="Judul Novel"]');
      await page.type('input[placeholder="Judul Novel"]', 'Test Novel');
      await page.type('textarea', 'Synopsis');
      const [simpanNovel] = await page.$x("//button[contains(., 'Simpan & Lanjutkan')]");
      await simpanNovel.click();
    }
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('\n--- 3. CREATE/SELECT CHAPTER ---');
    await page.waitForXPath("//button[contains(., 'Bab Baru')]", { timeout: 10000 });
    const [newBtn] = await page.$x("//button[contains(., 'Bab Baru')]");
    if (newBtn) {
       await newBtn.click();
       await new Promise(r => setTimeout(r, 1000));
    }
    await page.waitForSelector('.prose-editor');
    
    console.log('\n--- 4. TYPE CONTENT ---');
    await page.click('.prose-editor');
    const testString = 'SEAKUNOVEL_FINAL_VISIBLE_TEST_123456';
    await page.keyboard.type(testString);
    
    const editorHtml = await page.evaluate(() => document.querySelector('.prose-editor').innerHTML);
    console.log('EDITOR HTML BEFORE SAVE:', editorHtml);
    
    console.log('\n--- 5. CLICK SAVE ---');
    const [saveBtn] = await page.$x("//button[contains(., 'Simpan')]");
    if (saveBtn) await saveBtn.click();
    await page.waitForResponse(res => res.url().includes('/chapters/') && res.status() === 200);
    
    console.log('\n--- 6. VERIFY DB AFTER SAVE ---');
    const [chapters] = await connection.query('SELECT * FROM chapters ORDER BY updated_at DESC LIMIT 1');
    console.log('DATABASE STORED:', chapters[0].content);
    const chapterId = chapters[0].id;
    const novelId = chapters[0].novel_id;
    
    console.log('\n--- 7. RELOAD EDITOR ---');
    await page.reload();
    await new Promise(r => setTimeout(r, 2000)); // wait for reload
    // We are back at novel list, we must click Tulis / Edit again!
    const [tulisBtn2] = await page.$x("//button[contains(., 'Tulis / Edit')]");
    if (tulisBtn2) await tulisBtn2.click();
    await new Promise(r => setTimeout(r, 2000));
    
    // Select the chapter again (or it is auto-selected)
    const editorHtmlAfter = await page.evaluate(() => {
      const ed = document.querySelector('.prose-editor');
      return ed ? ed.innerHTML : 'NOT FOUND';
    });
    console.log('EDITOR HTML AFTER RELOAD:', editorHtmlAfter);
    
    console.log('\n--- 8. PUBLISH ---');
    const [pubBtn] = await page.$x("//button[contains(., 'Terbitkan')]");
    if (pubBtn) {
      await pubBtn.click();
      await page.waitForResponse(res => res.url().includes('/publish') && res.status() === 200);
    }
    
    console.log('\n--- 9. VERIFY DB AFTER PUBLISH ---');
    const [chaptersPub] = await connection.query('SELECT * FROM chapters WHERE id = ?', [chapterId]);
    console.log('DATABASE STORED AFTER PUBLISH:', chaptersPub[0].content);

    console.log('\n--- 10. OPEN READER ---');
    let getResponse = null;
    page.on('response', async res => {
      if (res.request().method() === 'GET' && res.url().includes(`/chapters/${chapterId}`)) {
        try {
          getResponse = await res.json();
          console.log('GET API RESPONSE IN READER:', getResponse.chapter.content);
        } catch(e) {}
      }
    });
    
    await page.goto(`http://localhost:5173/read/${novelId}/${chapterId}`);
    
    await page.waitForSelector('.prose-reader', { timeout: 10000 }).catch(() => console.log('Timeout waiting for .prose-reader'));
    
    const domData = await page.evaluate(() => {
      const el = document.querySelector('.prose-reader');
      if (!el) return { found: false };
      
      const computedStyle = window.getComputedStyle(el);
      return {
        found: true,
        html: el.innerHTML,
        textContent: el.textContent,
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        height: computedStyle.height,
        color: computedStyle.color,
        backgroundColor: computedStyle.backgroundColor,
        zIndex: computedStyle.zIndex
      };
    });
    
    console.log('\n--- 11. READER DOM ANALYSIS ---');
    console.log(domData);

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await browser.close();
    await connection.end();
  }
}
runTest();
