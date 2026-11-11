import http from 'http';

function postJson(path, data, token=null) {
  return new Promise((resolve, reject) => {
    const d = JSON.stringify(data);
    const options = {
      hostname: 'localhost', port: 3001, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d)
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(options, (res) => {
      let body=''; res.setEncoding('utf8'); res.on('data', c=>body+=c); res.on('end', ()=>{
        resolve({status:res.statusCode, headers:res.headers, body});
      });
    });
    req.on('error', reject); req.write(d); req.end();
  });
}

async function run(){
  try{
    const login = await postJson('/api/auth/login',{email:'arya.pratama@example.com', password:'Password123!'});
    console.log('login', login.status);
    const tokenObj = JSON.parse(login.body).token;
    const token = tokenObj;
    const novelData = { title: 'API Test Novel', slug: 'api-test-novel', synopsis: 'Test novel created by automated test', status: 'draft', genre_ids: [] };
    const create = await postJson('/api/novels', novelData, token);
    console.log('create', create.status, create.body);
  }catch(err){ console.error(err); process.exit(1);} }

run();
