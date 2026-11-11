import http from 'http';

function requestJson(method, path, data=null, token=null) {
  return new Promise((resolve, reject) => {
    const d = data ? JSON.stringify(data) : null;
    const options = { hostname:'localhost', port:3001, path, method, headers: {} };
    if (d) options.headers['Content-Type']='application/json';
    if (d) options.headers['Content-Length']=Buffer.byteLength(d);
    if (token) options.headers['Authorization']=`Bearer ${token}`;
    const req = http.request(options, (res)=>{
      let body=''; res.setEncoding('utf8'); res.on('data',c=>body+=c); res.on('end',()=>resolve({status:res.statusCode, headers:res.headers, body}));
    });
    req.on('error',reject);
    if (d) req.write(d);
    req.end();
  });
}

(async ()=>{
  try{
    const login = await requestJson('POST','/api/auth/login',{email:'arya.pratama@example.com', password:'Password123!'});
    const token = JSON.parse(login.body).token;
    const create = await requestJson('POST','/api/novels',{title:'Flow Test Novel', slug:'flow-test-novel', synopsis:'Flow test', status:'draft'}, token);
    const novel = JSON.parse(create.body).novel;
    console.log('created', novel.id);
    const publish = await requestJson('PUT',`/api/novels/${novel.id}/publish`, null, token);
    console.log('publish', publish.status, publish.body);
    const unpublish = await requestJson('PUT',`/api/novels/${novel.id}/unpublish`, null, token);
    console.log('unpublish', unpublish.status);
    const del = await requestJson('DELETE',`/api/novels/${novel.id}`, null, token);
    console.log('delete', del.status, del.body);
  }catch(err){console.error(err);process.exit(1);} })();
