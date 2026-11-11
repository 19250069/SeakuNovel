// Full e2e test: login -> get profile via token
const loginRes = await fetch('http://127.0.0.1:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'author@seakunovel.com', password: 'author123' })
});

const loginData = await loginRes.json();
console.log('Login status:', loginRes.status);
console.log('User email:', loginData.user?.email);
console.log('User role:', loginData.user?.role);
console.log('Token present:', !!loginData.token);

if (loginData.token) {
  // Test GET /auth/profile with Bearer token
  const profileRes = await fetch('http://127.0.0.1:3001/api/auth/profile', {
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });
  const profileData = await profileRes.json();
  console.log('\nProfile status:', profileRes.status);
  console.log('Profile email:', profileData.profile?.email);
  
  // Test GET /novels/me
  const novelsRes = await fetch('http://127.0.0.1:3001/api/novels/me', {
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });
  const novelsData = await novelsRes.json();
  console.log('\nNovels /me status:', novelsRes.status);
  console.log('Novels count:', novelsData.novels?.length ?? 'N/A');
}

process.exit(0);
