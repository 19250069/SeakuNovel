/**
 * SeakuNovel Full Platform Regression Verification Suite
 * Tests end-to-end user journeys across all 14 phases.
 */

import http from 'http';
import dotenv from 'dotenv';
import { query } from './config/db.js';

dotenv.config();

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api`;

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const method = options.method || 'GET';
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const body = options.body ? JSON.stringify(options.body) : null;

  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = data;
          }
          resolve({ status: res.statusCode, data: json });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runSuite() {
  console.log('\n======================================================');
  console.log('  SeakuNovel — Full Platform Integration & Regression  ');
  console.log('======================================================\n');

  // 1. Health Check
  console.log('[1/8] Checking Health Endpoint...');
  const health = await request('/health');
  assert(health.status === 200 && health.data.status === 'ok', 'Health check is operational');

  // 2. Authentication across roles
  console.log('\n[2/8] Verifying Multi-Role Authentication...');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@seakunovel.com', password: 'Password123!' },
  });
  assert(adminLogin.status === 200 && adminLogin.data.user.role === 'admin', 'Admin login successful');
  const adminToken = adminLogin.data.token;

  const authorLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'arya.pratama@example.com', password: 'Password123!' },
  });
  assert(authorLogin.status === 200 && authorLogin.data.user.role === 'author', 'Author login successful');
  const authorToken = authorLogin.data.token;
  const authorUser = authorLogin.data.user;

  const readerLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'maya.sari@example.com', password: 'Password123!' },
  });
  assert(readerLogin.status === 200 && readerLogin.data.user.role === 'reader', 'Reader login successful');
  const readerToken = readerLogin.data.token;
  const readerUser = readerLogin.data.user;

  // 3. In-App Notifications
  console.log('\n[3/8] Verifying In-App Notifications API...');
  const notifs = await request('/notifications', {
    headers: { Authorization: `Bearer ${readerToken}` },
  });
  assert(notifs.status === 200, 'Reader can retrieve notifications');
  assert(Array.isArray(notifs.data.notifications), 'Notifications returned as array');

  if (notifs.data.notifications.length > 0) {
    const firstNotif = notifs.data.notifications[0];
    const markOne = await request(`/notifications/${firstNotif.id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${readerToken}` },
    });
    assert(markOne.status === 200, 'Individual notification marked as read');
  }

  const markAll = await request('/notifications/read-all', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${readerToken}` },
  });
  assert(markAll.status === 200, 'Mark all notifications as read successful');

  const unreadCheck = await request('/notifications/unread-count', {
    headers: { Authorization: `Bearer ${readerToken}` },
  });
  assert(unreadCheck.status === 200 && unreadCheck.data.count === 0, 'Unread count verified as 0');

  // 4. Follows System
  console.log('\n[4/8] Verifying Follows System...');
  const followAuthor = await request('/follows/toggle', {
    method: 'POST',
    headers: { Authorization: `Bearer ${readerToken}` },
    body: { target_type: 'author', target_id: authorUser.id },
  });
  assert(followAuthor.status === 200, 'Reader can toggle follow author');

  const checkFollow = await request(`/follows/status?target_type=author&target_id=${authorUser.id}`, {
    headers: { Authorization: `Bearer ${readerToken}` },
  });
  assert(checkFollow.status === 200 && typeof checkFollow.data.followed === 'boolean', 'Follow status checked correctly');

  // 5. Admin Moderation & RBAC
  console.log('\n[5/8] Verifying Admin Dashboard & Moderation...');
  // Non-admin attempt should be 403
  const forbiddenAttempt = await request('/admin/stats', {
    headers: { Authorization: `Bearer ${readerToken}` },
  });
  assert(forbiddenAttempt.status === 403, 'RBAC properly blocks reader from admin stats');

  // Admin access
  const adminStats = await request('/admin/stats', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminStats.status === 200, 'Admin can retrieve platform statistics');
  assert(adminStats.data.users.total >= 26, `Platform tracks total users (${adminStats.data.users.total})`);
  assert(adminStats.data.novels.total >= 20, `Platform tracks total novels (${adminStats.data.novels.total})`);
  assert(adminStats.data.chapters.total >= 80, `Platform tracks total chapters (${adminStats.data.chapters.total})`);
  assert(adminStats.data.reports.total >= 3, `Platform tracks moderation reports (${adminStats.data.reports.total})`);

  // Admin user list
  const userList = await request('/admin/users?limit=5', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(userList.status === 200 && userList.data.users.length > 0, 'Admin can list users with pagination');

  // Admin reports list and resolve
  const adminReports = await request('/admin/reports', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminReports.status === 200 && adminReports.data.reports.length > 0, 'Admin can view reported content');

  const openReport = adminReports.data.reports.find((r) => r.status === 'open');
  if (openReport) {
    const resolveRes = await request(`/admin/reports/${openReport.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'resolved' },
    });
    assert(resolveRes.status === 200, 'Admin can resolve a content violation report');
  }

  // 6. Author Studio & Analytics
  console.log('\n[6/8] Verifying Author Studio Analytics...');
  const authorAnalytics = await request('/author/analytics', {
    headers: { Authorization: `Bearer ${authorToken}` },
  });
  assert(authorAnalytics.status === 200, 'Author can retrieve personal analytics');
  assert(authorAnalytics.data.novels.length > 0, 'Author novels breakdown returned');

  // 7. Reading Progress & Bookmarks
  console.log('\n[7/8] Verifying Reading Progress & Library...');
  const novelListRes = await request('/novels?limit=1');
  assert(novelListRes.status === 200 && novelListRes.data.novels.length > 0, 'Public novel list retrieved');
  const sampleNovel = novelListRes.data.novels[0];

  const chaptersRes = await request(`/chapters/novel/${sampleNovel.id}`);
  assert(chaptersRes.status === 200 && chaptersRes.data.chapters.length > 0, 'Chapters list retrieved');
  const sampleChapter = chaptersRes.data.chapters[0];

  // Save progress
  const saveProgress = await request(`/reading-progress/${sampleNovel.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${readerToken}` },
    body: {
      chapter_id: sampleChapter.id,
      progress_percent: 50.0,
    },
  });
  if (saveProgress.status !== 200) {
    console.log('SAVE PROGRESS ERROR:', saveProgress.status, saveProgress.data);
  }
  assert(saveProgress.status === 200, 'Reader reading progress saved');

  // Get progress
  const getProgress = await request(`/reading-progress/${sampleNovel.id}`, {
    headers: { Authorization: `Bearer ${readerToken}` },
  });
  assert(getProgress.status === 200 && parseFloat(getProgress.data.progress.progress_percent) >= 50, 'Reader progress restored accurately');

  // Add bookmark
  const addBookmark = await request(`/bookmarks/${sampleNovel.id}/toggle`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${readerToken}` },
  });
  assert(addBookmark.status === 200 || addBookmark.status === 201, 'Reader can bookmark novel');

  // 8. Background Scheduler Worker
  console.log('\n[8/8] Verifying Background Publication Scheduler...');
  const { checkAndPublishScheduled } = await import('./workers/scheduler.js');
  const schedResult = await checkAndPublishScheduled();
  assert(typeof schedResult.processed === 'number', 'Scheduler background check executed cleanly');

  console.log('\n======================================================');
  console.log('  🎉 ALL PLATFORM REGRESSION TESTS PASSED (100%)       ');
  console.log('======================================================\n');
}

runSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
