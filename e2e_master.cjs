const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runMasterTest() {
  console.log("Starting Master E2E Verification...");
  const browser = await puppeteer.launch({ headless: true });
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
    // FLOW A - AUTH
    // ==========================================
    console.log("Running FLOW A - AUTH");
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', '123@123.com');
    await page.type('input[type="password"]', '123123'); // I reset this earlier
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    const homeContent = await page.content();
    if (!homeContent.includes('123@123.com') && !homeContent.includes('Profil') && !homeContent.includes('Write')) {
      throw new Error("FLOW A FAILED: Did not log in successfully");
    }
    console.log("✓ Login successful");

    // ==========================================
    // FLOW B - CREATE NOVEL
    // ==========================================
    console.log("Running FLOW B - CREATE NOVEL");
    await page.goto('http://localhost:5173/write', { waitUntil: 'networkidle2' });
    
    // Check if we need to click "Buat Novel Baru"
    const newNovelBtn = await page.$('button::-p-text(Buat Novel Baru)');
    if (newNovelBtn) {
      await newNovelBtn.click();
      await wait(1000);
    }
    
    // Fill novel details
    const testTitle = `Test Novel ${Date.now()}`;
    await page.type('input[placeholder="Masukkan judul..."]', testTitle);
    await page.type('textarea[placeholder="Tulis sinopsis cerita..."]', 'This is an automated test synopsis.');
    
    // Save novel
    const saveNovelBtn = await page.$('button::-p-text(Simpan)');
    if (saveNovelBtn) {
      await saveNovelBtn.click();
      await wait(2000); // Wait for API
    }
    
    // Verify novel exists in list
    await page.goto('http://localhost:5173/write', { waitUntil: 'networkidle2' });
    const writeContent = await page.content();
    if (!writeContent.includes(testTitle)) {
      throw new Error("FLOW B FAILED: Novel was not saved");
    }
    console.log("✓ Create Novel successful");

    // ==========================================
    // FLOW C & D - CREATE CHAPTER & PUBLISH & READ
    // ==========================================
    console.log("Running FLOW C & D - CHAPTER CONTENT & PUBLISH");
    
    // Click the newly created novel (find the button next to the title)
    const [novelEditBtn] = await page.$x(`//h3[contains(text(), '${testTitle}')]/../../div/button[contains(text(), 'Tulis / Edit')]`);
    if (novelEditBtn) {
      await novelEditBtn.click();
      await wait(2000);
    } else {
      throw new Error("FLOW C FAILED: Could not find the created novel in the list.");
    }

    // Click "Bab Baru"
    const newChapterBtn = await page.$('button::-p-text(Bab Baru)');
    if (newChapterBtn) {
      await newChapterBtn.click();
      await wait(1500);
    } else {
      // maybe it's "Tulis Bab Pertama"
      const firstChapterBtn = await page.$('button::-p-text(Tulis Bab Pertama)');
      if (firstChapterBtn) {
        await firstChapterBtn.click();
        await wait(1500);
      }
    }

    // Inside chapter editor
    const chapterTitle = `Chapter 1 - ${Date.now()}`;
    await page.type('input[placeholder="Judul bab..."]', chapterTitle);
    
    // Type in Tiptap editor
    await page.click('.tiptap');
    const testContent = `SEAKUNOVEL_REAL_CONTENT_TEST_987654321_ABC`;
    await page.keyboard.type(testContent);
    await wait(1000);

    // Save Draft
    const saveBtn = await page.$('button::-p-text(Simpan)');
    if (saveBtn) {
      await saveBtn.click();
      await wait(2000);
    }

    // Publish
    const publishBtn = await page.$('button::-p-text(Terbitkan)');
    if (publishBtn) {
      await publishBtn.click();
      await wait(2000);
      
      // Confirm modal if any
      const confirmBtn = await page.$('button::-p-text(Ya, Terbitkan)');
      if (confirmBtn) {
        await confirmBtn.click();
        await wait(2000);
      }
    }

    if (!createdNovelId || !createdChapterId) {
      console.warn("Could not capture IDs from network, attempting to scrape DOM or fallback...");
      // Let's scrape DOM just in case we need it, but network interception should work.
    }

    // Verify in Public Reader
    console.log(`Checking public reader at /reader/${createdNovelId}/${createdChapterId}`);
    await page.goto(`http://localhost:5173/reader/${createdNovelId}/${createdChapterId}`, { waitUntil: 'networkidle2' });
    
    const readerContent = await page.content();
    if (!readerContent.includes(testContent)) {
      await page.screenshot({ path: 'master_test_failed.png' });
      throw new Error("FLOW D FAILED: Chapter content did not persist in public reader! (See master_test_failed.png)");
    }
    console.log("✓ Chapter Content & Publish successful");

    console.log("ALL CRITICAL FLOWS VERIFIED SUCCESSFUL.");

  } catch (error) {
    console.error("TEST FAILED:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runMasterTest();
