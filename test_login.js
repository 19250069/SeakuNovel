import axios from 'axios';
async function test() {
  try {
    const res = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@seakunovel.com',
      password: 'admin123'
    });
    console.log("Login success:", res.data.message);
  } catch (err) {
    console.error("Login failed:", err.response ? err.response.data : err.message);
  }
}
test();
