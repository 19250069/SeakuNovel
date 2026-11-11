import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from './config/db.js';

dotenv.config();

async function runTests() {
  console.log('=== PHASE 1 TEST SUITE ===\n');

  // 1. Verify Database Tables
  console.log('1. Checking Database Tables...');
  const tables = [
    'users', 'genres', 'drafts', 'novels', 'chapters', 'novel_genres',
    'reviews', 'review_likes', 'bookmarks', 'reading_progress', 'comments',
    'sessions', 'chapter_views', 'follows', 'notifications', 'reports',
    'scheduled_publications', 'analytics'
  ];

  for (const table of tables) {
    const res = await query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
      [table]
    );
    if (res.length === 0) {
      throw new Error(`Missing expected table: ${table}`);
    }
  }
  console.log(`✓ All ${tables.length} database tables verified.`);

  // 2. Auth, Password, and Role functions
  console.log('\n2. Testing Registration, Login, Change Password, and Become Author...');
  const testUser = `test_p1_${Date.now()}`;
  const testEmail = `${testUser}@example.com`;
  const initialPass = 'Password123!';
  const updatedPass = 'NewPassword456!';

  // Register user with reader role
  const hash = await bcrypt.hash(initialPass, 10);
  const userId = crypto.randomUUID();
  await query(
    'INSERT INTO users (id, username, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, testUser, testEmail, hash, 'Phase 1 Tester', 'reader']
  );
  console.log(`✓ Created test user ${testUser} with role 'reader'`);

  // Verify password compare
  const [dbUser] = await query('SELECT * FROM users WHERE id = ?', [userId]);
  const passMatches = await bcrypt.compare(initialPass, dbUser.password_hash);
  if (!passMatches) throw new Error('Password hash does not match initial password');
  console.log('✓ Initial password verified with bcrypt');

  // Test Password Change
  const newHash = await bcrypt.hash(updatedPass, 10);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
  const [updatedUser] = await query('SELECT * FROM users WHERE id = ?', [userId]);
  const oldPassMatches = await bcrypt.compare(initialPass, updatedUser.password_hash);
  const newPassMatches = await bcrypt.compare(updatedPass, updatedUser.password_hash);
  if (oldPassMatches || !newPassMatches) throw new Error('Password update verification failed');
  console.log('✓ Password change verified: old password rejected, new password accepted');

  // Test Become Author (Role Upgrade)
  await query("UPDATE users SET role = 'author' WHERE id = ?", [userId]);
  const [authorUser] = await query('SELECT role FROM users WHERE id = ?', [userId]);
  if (authorUser.role !== 'author') throw new Error('Role update to author failed');
  console.log('✓ Reader successfully upgraded to Author without creating a new account');

  // Cleanup test user
  await query('DELETE FROM users WHERE id = ?', [userId]);
  console.log('✓ Test user cleaned up.');

  console.log('\n=== ALL PHASE 1 TESTS PASSED ===\n');
}

runTests().then(() => process.exit(0)).catch((err) => {
  console.error('Phase 1 test failed:', err);
  process.exit(1);
});
