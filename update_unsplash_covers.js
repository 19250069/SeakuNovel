import { query } from './server/config/db.js';

const delay = ms => new Promise(res => setTimeout(res, ms));

async function getUnsplashCover(keyword) {
  try {
    const res = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(keyword)}&per_page=5`);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      // Pick a random one from top 5 to avoid all looking exactly the same
      const rand = Math.floor(Math.random() * Math.min(data.results.length, 5));
      return data.results[rand].urls.regular;
    }
    return null;
  } catch (err) {
    return null;
  }
}

function getKeyword(title) {
  const lower = title.toLowerCase();
  if (lower.includes('cinta') || lower.includes('melodi') || lower.includes('surat')) return 'romantic couple aesthetic';
  if (lower.includes('hutan') || lower.includes('misteri') || lower.includes('kematian') || lower.includes('bisikan')) return 'dark forest creepy';
  if (lower.includes('neon') || lower.includes('bintang')) return 'cyberpunk neon city night';
  if (lower.includes('kastil') || lower.includes('legenda') || lower.includes('cahaya')) return 'epic fantasy castle';
  if (lower.includes('pengembara') || lower.includes('petualangan')) return 'epic landscape mountain traveler';
  if (lower.includes('perpustakaan')) return 'aesthetic old library books';
  return 'book cover aesthetic';
}

async function run() {
  const novels = await query('SELECT id, title FROM novels');
  console.log(`Found ${novels.length} novels to update with Unsplash.`);

  for (let i = 0; i < novels.length; i++) {
    const novel = novels[i];
    const keyword = getKeyword(novel.title);
    console.log(`[${i+1}/${novels.length}] Fetching Unsplash image for: ${novel.title} (Query: ${keyword})`);
    
    const url = await getUnsplashCover(keyword);
    if (url) {
      await query('UPDATE novels SET cover_url = ? WHERE id = ?', [url, novel.id]);
      console.log(` -> Saved Unsplash URL!`);
    } else {
      console.log(` -> Failed to get Unsplash URL.`);
    }
    
    await delay(1000); // 1s delay to respect Unsplash public API limits
  }
  
  console.log('All existing novels updated!');
  process.exit(0);
}

run();
