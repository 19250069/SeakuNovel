// test-moderation-and-pwa.js
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

async function runModerationTests() {
  console.log('\n======================================================');
  console.log('  TESTING COMMENT/REVIEW REPORTING & ADMIN MODERATION');
  console.log('======================================================\n');

  // 1. Login reader
  const readerLogin = await axios.post(`${API_BASE}/auth/login`, {
    email: 'maya.sari@example.com',
    password: 'Password123!'
  });
  const readerToken = readerLogin.data.token;
  console.log('✓ Reader authenticated successfully');

  // 2. Login admin
  const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@seakunovel.com',
    password: 'Password123!'
  });
  const adminToken = adminLogin.data.token;
  console.log('✓ Admin authenticated successfully');

  // 3. Find a review to report
  const reviewsRes = await axios.get(`${API_BASE}/reviews?limit=5`);
  const review = reviewsRes.data.reviews[0];
  if (!review) throw new Error('No reviews found to test');
  console.log(`✓ Retrieved review: ID=${review.id} for novel "${review.novel_title}"`);

  // 4. Report the review
  const reportReviewRes = await axios.post(
    `${API_BASE}/reports`,
    {
      target_type: 'review',
      target_id: review.id,
      reason: 'Konten seksual eksplisit atau kekerasan ekstrem',
      details: 'Automated test report for review moderation'
    },
    { headers: { Authorization: `Bearer ${readerToken}` } }
  );
  console.log('✓ Reader successfully submitted report for review:', reportReviewRes.data.report.id);
  const createdReviewReportId = reportReviewRes.data.report.id;

  // 5. Find a comment to report
  const commentsRes = await axios.get(`${API_BASE}/comments/review/${review.id}`);
  let commentId = commentsRes.data.comments?.[0]?.id;
  if (!commentId) {
    // create a test comment first
    const newCommentRes = await axios.post(
      `${API_BASE}/comments`,
      { review_id: review.id, content: 'Test comment for moderation report' },
      { headers: { Authorization: `Bearer ${readerToken}` } }
    );
    commentId = newCommentRes.data.comment.id;
  }
  console.log(`✓ Target comment ID=${commentId}`);

  // 6. Report the comment
  const reportCommentRes = await axios.post(
    `${API_BASE}/reports`,
    {
      target_type: 'comment',
      target_id: commentId,
      reason: 'Spam, promosi tidak relevan, atau bot',
      details: 'Automated test report for comment moderation'
    },
    { headers: { Authorization: `Bearer ${readerToken}` } }
  );
  console.log('✓ Reader successfully submitted report for comment:', reportCommentRes.data.report.id);
  const createdCommentReportId = reportCommentRes.data.report.id;

  // 7. Admin retrieves report list
  const adminReportsRes = await axios.get(`${API_BASE}/admin/reports`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log(`✓ Admin retrieved ${adminReportsRes.data.reports.length} reports`);

  const foundReviewReport = adminReportsRes.data.reports.find(r => r.id === createdReviewReportId);
  const foundCommentReport = adminReportsRes.data.reports.find(r => r.id === createdCommentReportId);

  if (!foundReviewReport || !foundCommentReport) {
    throw new Error('Created reports not found in admin reports list');
  }
  console.log('✓ Both newly submitted reports verified in admin list');

  // 8. Admin updates report status to "resolved"
  const updateRes = await axios.put(
    `${API_BASE}/admin/reports/${createdReviewReportId}`,
    { status: 'resolved' },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  if (updateRes.data.report.status !== 'resolved') {
    throw new Error(`Expected status to be resolved, got ${updateRes.data.report.status}`);
  }
  console.log('✓ Admin successfully updated report status to "resolved"');

  // 9. Admin dismisses the other report
  const dismissRes = await axios.put(
    `${API_BASE}/admin/reports/${createdCommentReportId}`,
    { status: 'dismissed' },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  if (dismissRes.data.report.status !== 'dismissed') {
    throw new Error(`Expected status to be dismissed, got ${dismissRes.data.report.status}`);
  }
  console.log('✓ Admin successfully updated report status to "dismissed"');

  console.log('\n======================================================');
  console.log('  🎉 ALL MODERATION FLOWS VERIFIED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runModerationTests().catch((err) => {
  console.error('Moderation test failed:', err.response?.data || err.message);
  process.exit(1);
});
