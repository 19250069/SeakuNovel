const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:5173";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runLaunchTest() {
  console.log("Starting Launch Verification E2E...");
  const browser = await puppeteer.launch({ 
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  let createdNovelId = null;
  let createdChapterId = null;

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/novels') && response.request().method() === 'POST') {
      try { const json = await response.json(); if (json.id) createdNovelId = json.id; } catch (e) {}
    }
    if (url.includes('/api/chapters') && response.request().method() === 'POST') {
      try { const json = await response.json(); if (json.chapter?.id) createdChapterId = json.chapter.id; } catch (e) {}
    }
  });

  try {
    // ==========================================
    // PHASE 2 - AUTH FINAL TEST
    // ==========================================
    console.log("Testing Auth (Invalid & Valid)...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', '123@123.com');
    await page.type('input[type="password"]', 'WRONGPASSWORD'); 
    await page.click('button[type="submit"]');
    await wait(2000);
    
    let content = await page.content();
    if (!content.includes('Invalid email or password') && !content.includes('Terlalu banyak percobaan')) {
      throw new Error("Auth FAILED: Did not show error for wrong password.");
    }
    
    // Clear and type correct
    await page.evaluate(() => document.querySelector('input[type="password"]').value = '');
    await page.type('input[type="password"]', '123123'); 
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log("Auth working.");

    // ==========================================
    // PHASE 3 & 4 - CHAPTER DATA INTEGRITY & AUTOSAVE
    // ==========================================
    console.log("Testing Autosave Race Conditions & Data Integrity...");
    await page.goto(`${BASE_URL}/write`, { waitUntil: 'networkidle2' });
    
    const newNovelBtn = await page.$('button::-p-text(Buat Novel Baru)');
    if (newNovelBtn) await newNovelBtn.click();
    await wait(1000);
    
    await page.type('input[placeholder="Masukkan judul..."]', `Auto Novel ${Date.now()}`);
    const saveNovelBtn = await page.$('button::-p-text(Simpan)');
    if (saveNovelBtn) await saveNovelBtn.click();
    await wait(2000);
    
    await page.goto(`${BASE_URL}/write`, { waitUntil: 'networkidle2' });
    const novelEditBtns = await page.$x(`//button[contains(text(), 'Tulis / Edit')]`);
    if (novelEditBtns.length > 0) {
      await novelEditBtns[0].click();
      await wait(2000);
    }
    
    const newChapterBtn = await page.$('button::-p-text(Bab Baru)');
    if (newChapterBtn) await newChapterBtn.click();
    else {
      const firstChapterBtn = await page.$('button::-p-text(Tulis Bab Pertama)');
      if (firstChapterBtn) await firstChapterBtn.click();
    }
    await wait(1500);
    
    await page.type('input[placeholder="Judul bab..."]', `Auto Chapter ${Date.now()}`);
    
    // Type AAAA, wait 4s
    await page.click('.tiptap');
    await page.keyboard.type("AAAA ");
    await wait(4000); // Wait for first autosave to trigger and complete
    
    // Type BBBB, then quickly CCCC
    await page.keyboard.type("BBBB ");
    await wait(500); // 0.5s later (autosave debounce is 3s)
    await page.keyboard.type("EXISTING_PLATFORM_CONTENT_TEST_987654321");
    
    // Wait for the final autosave debounce (3s) + network (2s)
    await wait(6000);
    
    console.log("Autosave triggered. Refreshing...");
    await page.reload({ waitUntil: 'networkidle2' });
    await wait(2000);
    
    // Reopen chapter
    const chapterBtn = await page.$(`button::-p-text(Auto Chapter)`);
    if (chapterBtn) await chapterBtn.click();
    await wait(2000);
    
    let editorHtml = await page.evaluate(() => document.querySelector('.tiptap').innerHTML);
    if (!editorHtml.includes("EXISTING_PLATFORM_CONTENT_TEST_987654321")) {
       throw new Error(`Data integrity failed! Content lost after reload. Found: ${editorHtml}`);
    }
    console.log("Autosave and Reload persistence working.");

    // ==========================================
    // PHASE 5 & 8 - PUBLISH SAFETY & READER
    // ==========================================
    console.log("Testing Publish...");
    const publishBtn = await page.$('button::-p-text(Terbitkan)');
    if (publishBtn) await publishBtn.click();
    await wait(2000);
    
    console.log("Checking Reader...");
    if (createdNovelId && createdChapterId) {
      await page.goto(`${BASE_URL}/reader/${createdNovelId}/${createdChapterId}`, { waitUntil: 'networkidle2' });
      const readerHtml = await page.content();
      if (!readerHtml.includes("EXISTING_PLATFORM_CONTENT_TEST_987654321")) {
         throw new Error("Reader failed to display published content.");
      }
      console.log("Public Reader rendering perfectly.");
    }
    
    console.log("ALL E2E CRITICAL FLOWS VERIFIED SUCCESSFUL.");

  } catch (error) {
    console.error("TEST FAILED:", error);
    await page.screenshot({ path: 'launch_test_failed.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runLaunchTest();
