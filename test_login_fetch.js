import fetch from 'node-fetch'; // Wait, Node 18 has global fetch

async function testLogin() {
  try {
    const res = await fetch('http://127.0.0.1:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@seakunovel.com', password: 'Password123' })
    });
    
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${text}`);
  } catch (err) {
    console.error(err);
  }
}

testLogin();
