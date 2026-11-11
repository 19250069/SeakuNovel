import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from './config/db.js';

dotenv.config();

async function seed() {
  console.log('Seeding database...');
  try {
    // 1. Create Admin
    const adminEmail = 'admin@seakunovel.com';
    const adminExists = await query('SELECT id FROM users WHERE email = ?', [adminEmail]);
    let adminId;
    if (adminExists.length === 0) {
      adminId = crypto.randomUUID();
      const hash = await bcrypt.hash('admin123', 10);
      await query(
        'INSERT INTO users (id, email, password_hash, username, display_name, role) VALUES (?, ?, ?, ?, ?, ?)',
        [adminId, adminEmail, hash, 'admin', 'Administrator', 'admin']
      );
      console.log('Created admin user.');
    } else {
      adminId = adminExists[0].id;
    }

    // 2. Create Author
    const authorEmail = 'author@seakunovel.com';
    const authorExists = await query('SELECT id FROM users WHERE email = ?', [authorEmail]);
    let authorId;
    if (authorExists.length === 0) {
      authorId = crypto.randomUUID();
      const hash = await bcrypt.hash('author123', 10);
      await query(
        'INSERT INTO users (id, email, password_hash, username, display_name, role) VALUES (?, ?, ?, ?, ?, ?)',
        [authorId, authorEmail, hash, 'author_pro', 'Author Pro', 'author']
      );
      console.log('Created author user.');
    } else {
      authorId = authorExists[0].id;
    }

    // 3. Create Genres
    const genres = ['Fantasy', 'Adventure', 'Thriller', 'Romance', 'Sci-Fi', 'Horror', 'Slice of Life', 'Drama'];
    for (const g of genres) {
      const exists = await query('SELECT id FROM genres WHERE name = ?', [g]);
      if (exists.length === 0) {
        await query('INSERT INTO genres (id, name, description) VALUES (?, ?, ?)', [crypto.randomUUID(), g, `Kisah ${g} terbaik`]);
      }
    }
    console.log('Ensured genres exist.');

    // 4. Create Sample Novel
    const novelExists = await query('SELECT id FROM novels LIMIT 1');
    if (novelExists.length === 0) {
      const novelId = crypto.randomUUID();
      await query(
        'INSERT INTO novels (id, title, synopsis, author_id, status, cover_url) VALUES (?, ?, ?, ?, ?)',
        [novelId, 'Dunia Tersembunyi', 'Sebuah kisah epik tentang penemuan dunia lain di balik bayangan kota.', authorId, 'published', await getContextualCover('Dunia Tersembunyi')]
      );
      
      // Link to Fantasy
      const fantasy = await query('SELECT id FROM genres WHERE name = ?', ['Fantasy']);
      if (fantasy.length > 0) {
         await query('INSERT INTO novel_genres (id, novel_id, genre_id) VALUES (?, ?, ?)', [crypto.randomUUID(), novelId, fantasy[0].id]);
      }

      // Create a Chapter
      await query(
        'INSERT INTO chapters (id, novel_id, title, content, status, order_index, is_premium, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), novelId, 'Bab 1: Permulaan', 'Malam itu sangat sunyi. Terlalu sunyi.', 'published', 1, false, 0]
      );
      
      console.log('Created sample novel and chapter.');
    }

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();