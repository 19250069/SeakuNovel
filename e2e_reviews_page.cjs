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
    
    // Go to /reviews
    console.log("Navigating to /reviews...");
    await page.goto(`${BASE_URL}/reviews`);
    await wait(2000);
    
    // Check likes
    const likeBtn = await page.$('button[aria-label*="uka"]');
    if (!likeBtn) {
       console.log("No review to like!");
       return;
    }
    
    let likeText = await page.evaluate(el => el.innerText, likeBtn);
    let initialLikes = parseInt(likeText.replace(/[^0-9]/g, '')) || 0;
    console.log("Initial Likes: " + initialLikes);
    
    // Click like
    console.log("Clicking like...");
    await page.evaluate(el => el.click(), likeBtn);
    await wait(2000);
    
    likeText = await page.evaluate(el => el.innerText, await page.$('button[aria-label*="uka"]'));
    let afterLike = parseInt(likeText.replace(/[^0-9]/g, '')) || 0;
    console.log("After Like: " + afterLike);
    
    if (afterLike !== initialLikes + 1) {
       if (afterLike === initialLikes - 1) {
           console.log("It was already liked, so it unliked! Reversing test logic...");
           // We'll treat this as the baseline
           initialLikes = afterLike;
           console.log("Clicking like again...");
           const likeBtnAg = await page.$('button[aria-label*="uka"]');
           await page.evaluate(el => el.click(), likeBtnAg);
           await wait(2000);
           likeText = await page.evaluate(el => el.innerText, await page.$('button[aria-label*="uka"]'));
           afterLike = parseInt(likeText.replace(/[^0-9]/g, '')) || 0;
           console.log("Real After Like: " + afterLike);
           if (afterLike !== initialLikes + 1) throw new Error("Like failed");
       } else {
           throw new Error(`Like count wrong! Expected ${initialLikes + 1}, got ${afterLike}`);
       }
    }
    
    // Refresh
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(2000);
    likeText = await page.evaluate(el => el.innerText, await page.$('button[aria-label*="uka"]'));
    let afterRefresh = parseInt(likeText.replace(/[^0-9]/g, '')) || 0;
    console.log("After Refresh Like: " + afterRefresh);
    
    if (afterRefresh !== afterLike) {
       throw new Error(`Like count didn't persist! Expected ${afterLike}, got ${afterRefresh}`);
    }
    
    // Click unlike
    console.log("Clicking unlike...");
    const likeBtn2 = await page.$('button[aria-label*="uka"]');
    await page.evaluate(el => el.click(), likeBtn2);
    await wait(2000);
    
    likeText = await page.evaluate(el => el.innerText, await page.$('button[aria-label*="uka"]'));
    let afterUnlike = parseInt(likeText.replace(/[^0-9]/g, '')) || 0;
    console.log("After Unlike: " + afterUnlike);
    
    if (afterUnlike !== initialLikes) {
       throw new Error(`Unlike count wrong! Expected ${initialLikes}, got ${afterUnlike}`);
    }

    console.log("Success testing likes on /reviews!");

  } catch (err) {
    console.error("Test failed: ", err);
    await page.screenshot({ path: 'review_test_failed.png' });
  } finally {
    await browser.close();
  }
}

runReviewTest();
