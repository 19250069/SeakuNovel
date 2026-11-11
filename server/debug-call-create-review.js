import { createReview } from './models/review.js';

(async () => {
  try {
    const novelId = process.argv[2];
    const userId = process.argv[3];
    if (!novelId || !userId) {
      console.error('Usage: node debug-call-create-review.js <novelId> <userId>');
      process.exit(1);
    }
    const review = await createReview({ novel_id: novelId, user_id: userId, rating: 5, title: 'Debug review', content: 'Debug content.' });
    console.log('Created review:', review.id);
  } catch (err) {
    console.error('Error creating review:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
