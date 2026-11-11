import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import axios from 'axios';

async function run() {
  try {
    const connection = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: '', database: 'seaku_novel'});
    const [novels] = await connection.query('SELECT n.id, u.id as author_id, u.role FROM novels n JOIN users u ON n.author_id = u.id LIMIT 1');
    const novelId = novels[0].id;
    const token = jwt.sign({ id: novels[0].author_id, role: novels[0].role }, 'seaku-novel-dev-secret-key-change-in-production');
    
    const api = axios.create({ baseURL: 'http://127.0.0.1:3001/api', headers: { Cookie: 'seaku_token=' + token } });
    
    let res = await api.post('/chapters/create', { novel_id: novelId, title: 'Test Chapter', slug: 'test-chapter-' + Date.now() });
    const chapterId = res.data.chapter.id;
    console.log('Created Chapter:', chapterId);
    
    const content = '<p>SEAKUNOVEL_REAL_CONTENT_TEST_987654321</p>';
    await api.put('/chapters/' + chapterId, { title: 'Test Chapter', slug: 'test-chapter-' + Date.now(), content });
    console.log('Saved Chapter');
    
    await api.post('/chapters/' + chapterId + '/publish');
    console.log('Published Chapter');
    
    res = await api.get('/chapters/' + chapterId);
    console.log('Fetched Chapter Content:', res.data.chapter.content);
    process.exit();
  } catch (err) { console.error(err.response?.data || err.message); process.exit(1); }
}
run();
