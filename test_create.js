import { query } from './server/config/db.js';
import { createChapter } from './server/models/chapter.js';

async function test() {
  try {
    const novelId = (await query('SELECT id FROM novels LIMIT 1'))[0].id;
    console.log("Using Novel ID:", novelId);
    
    // Simulate first creation
    await createChapter({
      novel_id: novelId,
      title: "Test Bab 1",
      slug: "test-bab-1",
      content: "Hello",
      chapter_number: 1,
      order_index: 1
    });
    console.log("Creation 1 succeeded!");
    
    // Simulate second creation (which used to fail with ER_DUP_ENTRY due to chapter_number)
    await createChapter({
      novel_id: novelId,
      title: "Test Bab 2",
      slug: "test-bab-2",
      content: "Hello again",
      chapter_number: 1, // Frontend still passing 1 because chapters.length was 0 when mapped
      order_index: 1
    });
    console.log("Creation 2 succeeded!");

  } catch (err) {
    console.error("Failed:", err);
  } finally {
    process.exit(0);
  }
}

test();
