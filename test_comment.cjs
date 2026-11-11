const axios = require('axios');

async function testComment() {
  try {
    const loginRes = await axios.post('http://127.0.0.1:3001/api/auth/login', {
      email: '123@123.com',
      password: '123123'
    });
    
    const token = loginRes.data.token;
    console.log("Logged in!");

    // Get a review ID from the database
    // we know this one exists: 8c149170-9815-484c-a61d-ab2e3867537f
    const reviewId = '8c149170-9815-484c-a61d-ab2e3867537f';
    
    console.log("Posting comment...");
    const commentRes = await axios.post('http://127.0.0.1:3001/api/comments', {
      review_id: reviewId,
      content: 'EXISTING_REVIEW_COMMENT_TEST_987654321'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("Comment posted!", commentRes.data);
  } catch (err) {
    console.error("Failed!", err.response ? err.response.data : err.message);
  }
}

testComment();
