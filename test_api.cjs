const axios = require('axios');
const jwt = require('jsonwebtoken');

async function run() {
  try {
    const token = jwt.sign({ id: '055a2dce-4934-4931-9461-0dd217acccb2', role: 'author' }, 'seaku-novel-dev-secret-key-change-in-production');
    const api = axios.create({
      baseURL: 'http://127.0.0.1:3001/api',
      headers: { Cookie: `seaku_token=${token}` }
    });
    
    // Get novels
    const { data: { novels } } = await api.get('/novels/my-novels');
    const novelId = novels[0].id;
    console.log('Novel ID:', novelId);
    
    // Create chapter
    const { data: { chapter: newChap } } = await api.post('/chapters', { novel_id: novelId, title: 'Test Chapter' });
    const chapterId = newChap.id;
    console.log('Created Chapter:', chapterId);
    
    // Save chapter
    const content = '<p>SEAKUNOVEL_REAL_CONTENT_TEST_987654321</p>';
    await api.put(`/chapters/${chapterId}`, { title: 'Test Chapter', content });
    console.log('Saved Chapter');
    
    // Publish
    await api.post(`/chapters/${chapterId}/publish`);
    console.log('Published Chapter');
    
    // Get chapter (simulate reader)
    const { data: { chapter: fetchedChap } } = await api.get(`/chapters/${chapterId}`);
    console.log('Fetched Chapter Content:', fetchedChap.content);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
run();
