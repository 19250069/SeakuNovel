import fs from 'fs';
import path from 'path';
import { query } from './server/config/db.js';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getKeyword(title) {
  const lower = title.toLowerCase();
  if (lower.includes('cinta') || lower.includes('melodi') || lower.includes('surat')) return 'couple,love';
  if (lower.includes('hutan') || lower.includes('misteri') || lower.includes('kematian') || lower.includes('bisikan')) return 'dark,forest';
  if (lower.includes('neon') || lower.includes('bintang')) return 'city,neon';
  if (lower.includes('kastil') || lower.includes('legenda') || lower.includes('cahaya')) return 'castle,landscape';
  if (lower.includes('pengembara') || lower.includes('petualangan')) return 'mountain,adventure';
  return 'art,landscape';
}

async function run() {
  const novels = await query('SELECT id, title FROM novels');
  const coversDir = path.join(process.cwd(), 'public', 'covers');
  
  if (!fs.existsSync(coversDir)) {
    fs.mkdirSync(coversDir, { recursive: true });
  }

  for (let i = 0; i < novels.length; i++) {
    const novel = novels[i];
    const imagePath = path.join(coversDir, `${novel.id}.jpg`);
    const imageUrl = `/covers/${novel.id}.jpg`;

    const keyword = getKeyword(novel.title);
    console.log(`[${i+1}/${novels.length}] Fetching ${keyword} cover for: ${novel.title}`);
    
    // Fallback to picsum if loremflickr fails
    let success = false;
    
    try {
      const url = `https://loremflickr.com/600/900/${keyword}?lock=${i+200}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(imagePath, Buffer.from(buffer));
        await query('UPDATE novels SET cover_url = ? WHERE id = ?', [imageUrl, novel.id]);
        console.log(` -> Saved ${imageUrl} from LoremFlickr`);
        success = true;
      }
    } catch (err) {}

    if (!success) {
       console.log(' -> Falling back to Picsum...');
       const picsumUrl = `https://picsum.photos/seed/${novel.id}/600/900`;
       const res = await fetch(picsumUrl);
       if (res.ok) {
         const buffer = await res.arrayBuffer();
         fs.writeFileSync(imagePath, Buffer.from(buffer));
         await query('UPDATE novels SET cover_url = ? WHERE id = ?', [imageUrl, novel.id]);
         console.log(` -> Saved ${imageUrl} from Picsum`);
       }
    }
    
    await delay(200);
  }
  
  console.log('All done!');
  process.exit(0);
}

run();
