import axios from 'axios';
import http from 'http';

async function postMultipart(path, token, fields, fileFieldName, fileName, fileBuffer, fileType='image/jpeg'){
  const boundary = '----SeakuTestBoundary' + Date.now();
  const chunks = [];

  function push(str){ chunks.push(Buffer.from(str, 'utf8')); }

  for (const [k,v] of Object.entries(fields)){
    if (Array.isArray(v)){
      for (const item of v){
        push(`--${boundary}\r\n`);
        push(`Content-Disposition: form-data; name="${k}[]"\r\n\r\n`);
        push(String(item) + '\r\n');
      }
    } else {
      push(`--${boundary}\r\n`);
      push(`Content-Disposition: form-data; name="${k}"\r\n\r\n`);
      push(String(v) + '\r\n');
    }
  }

  // file part
  push(`--${boundary}\r\n`);
  push(`Content-Disposition: form-data; name="${fileFieldName}"; filename="${fileName}"\r\n`);
  push(`Content-Type: ${fileType}\r\n\r\n`);
  chunks.push(Buffer.from(fileBuffer));
  push('\r\n');

  push(`--${boundary}--\r\n`);

  const body = Buffer.concat(chunks.map(c => Buffer.isBuffer(c) ? c : Buffer.from(c)));

  return new Promise((resolve,reject)=>{
    const options = { hostname:'localhost', port:3001, path, method:'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        'Authorization': `Bearer ${token}`
      }
    };
    const req = http.request(options, (res)=>{
      let data=''; res.setEncoding('utf8'); res.on('data', c=>data+=c); res.on('end', ()=>resolve({status:res.statusCode, headers:res.headers, body:data}));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run(){
  try{
    // login
    const loginRes = await axios.post('http://localhost:3001/api/auth/login', { email: 'arya.pratama@example.com', password: 'Password123!' });
    const token = loginRes.data.token;
    console.log('Logged in, token length:', token ? token.length : 'none');

    // download sample image
    const imgUrl = 'https://images.unsplash.com/photo-1762554915502-7ce95effe4ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
    const imgResp = await axios.get(imgUrl, { responseType: 'arraybuffer' });
    const imgBuf = Buffer.from(imgResp.data);
    console.log('Downloaded image bytes:', imgBuf.length);

    const fields = { title: 'API Test Novel with Cover', slug: 'api-test-novel-cover', synopsis: 'Created by automated test with cover', status: 'draft', genre_ids: [] };

    const res = await postMultipart('/api/novels', token, fields, 'cover', 'cover.jpg', imgBuf, 'image/jpeg');
    console.log('Create novel status:', res.status);
    console.log('Response body:', res.body);
  }catch(err){
    console.error('Test failed:', err?.response?.data || err.message || err);
    process.exit(1);
  }
}

run();
