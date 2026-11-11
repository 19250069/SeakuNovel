import axios from 'axios';

async function run(){
  try{
    const login = await axios.post('http://localhost:3001/api/auth/login', { email: 'arya.pratama@example.com', password: 'Password123!' });
    const token = login.data.token;
    console.log('token length:', token.length);

    const novelRes = await axios.get('http://localhost:3001/api/novels', { params: { limit: 1 } });
    const novel = novelRes.data.novels && novelRes.data.novels[0];
    if(!novel){ console.log('No novels available to bookmark'); return; }

    const res = await axios.post(`http://localhost:3001/api/bookmarks/${novel.id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Bookmark created:', res.data);
  }catch(err){
    console.error('Bookmark test failed:', err.response?.status, err.response?.data || err.message);
    process.exit(1);
  }
}

run();
