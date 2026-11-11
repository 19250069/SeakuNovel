const puppeteer = require('puppeteer-core');

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
    
    // Check likes
    const likeBtn = await page.$('button::-p-text(Suka)');
    if (!likeBtn) {
        console.log("No review to like, exiting...");
        return;
    }
    let likeText = await page.evaluate(el => el.innerText, likeBtn);
    let initialLikes = parseInt(likeText.replace(/[^0-9]/g, '')) || 0;
    console.log("Initial Likes: " + initialLikes);
    
    // Click like
    console.log("Clicking like...");
    await page.evaluate(el => el.click(), likeBtn);
    await wait(2000); // Wait for loadReviews to finish fetching
    
    likeText = await page.evaluate(el => el.innerText, await page.$('button::-p-text(Suka)'));
    let afterLike = parseInt(likeText.replace(/[^0-9]/g, '')) || 0;
    console.log("After Like: " + afterLike);
    
    if (afterLike !== initialLikes + 1 && afterLike !== initialLikes - 1) {
       throw new Error(`Like count wrong! Expected +1 or -1, got ${afterLike} from ${initialLikes}`);
    }

    console.log("Success testing likes!");

  } catch (err) {
    console.error("Test failed: ", err);
    await page.screenshot({ path: 'review_test_failed.png' });
  } finally {
    await browser.close();
  }
}

runReviewTest();
