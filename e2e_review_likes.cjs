const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:5173";

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runReviewTest() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    console.log("Logging in...");
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[type="email"]', '123@123.com');
    await page.type('input[type="password"]', '123123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Find a published novel
    console.log("Navigating to Browse...");
    await page.goto(`${BASE_URL}/browse`);
    await wait(2000);
    
    // Click the first novel link
    const firstNovel = await page.$('a[href^="/novel/"]');
    if (!firstNovel) throw new Error("No novel found");
    
    // Click it and wait
    const novelHref = await page.evaluate(el => el.href, firstNovel);
    console.log("Going to novel: " + novelHref);
    await page.goto(novelHref);
    await wait(2000);
    
    // Create a review if none exists
    const reviewForm = await page.$('textarea[placeholder*="Bagikan"]');
    if (reviewForm) {
       console.log("Writing a review...");
       await page.type('input[placeholder*="Contoh"]', 'TEST REVIEW');
       await page.type('textarea[placeholder*="Bagikan"]', 'This is a test review for e2e.');
       await page.click('button::-p-text(Kirim Ulasan)');
       await wait(2000);
    }
    
    // Check likes
    const likeBtn = await page.$('button::-p-text(Suka)');
    let likeText = await page.evaluate(el => el.innerText, likeBtn);
    let initialLikes = parseInt(likeText.replace(/[^0-9]/g, '')) || 0;
    console.log("Initial Likes: " + initialLikes);
    
    // Click like
    console.log("Clicking like...");
    await likeBtn.click();
    await wait(2000);
    
    likeText = await page.evaluate(el => el.innerText, await page.$('button::-p-text(Suka)'));
    let afterLike = parseInt(likeText.replace(/[^0-9]/g, '')) || 0;
    console.log("After Like: " + afterLike);
    
    if (afterLike !== initialLikes + 1) {
       throw new Error(`Like count wrong! Expected ${initialLikes + 1}, got ${afterLike}`);
    }
    
    // Refresh
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(2000);
    likeText = await page.evaluate(el => el.innerText, await page.$('button::-p-text(Suka)'));
    let afterRefresh = parseInt(likeText.replace(/[^0-9]/g, '')) || 0;
    console.log("After Refresh Like: " + afterRefresh);
    
    if (afterRefresh !== afterLike) {
       throw new Error(`Like count didn't persist! Expected ${afterLike}, got ${afterRefresh}`);
    }
    
    // Click unlike
    console.log("Clicking unlike...");
    const likeBtn2 = await page.$('button::-p-text(Suka)');
    await likeBtn2.click();
    await wait(2000);
    
    likeText = await page.evaluate(el => el.innerText, await page.$('button::-p-text(Suka)'));
    let afterUnlike = parseInt(likeText.replace(/[^0-9]/g, '')) || 0;
    console.log("After Unlike: " + afterUnlike);
    
    if (afterUnlike !== initialLikes) {
       throw new Error(`Unlike count wrong! Expected ${initialLikes}, got ${afterUnlike}`);
    }

    // Now test Comments... wait, where is the comment UI?
    console.log("Success testing likes!");

  } catch (err) {
    console.error("Test failed: ", err);
    await page.screenshot({ path: 'review_test_failed.png' });
  } finally {
    await browser.close();
  }
}

runReviewTest();
