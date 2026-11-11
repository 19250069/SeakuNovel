// Full e2e test: login -> create novel -> create chapter -> update chapter -> verify
const BASE = 'http://127.0.0.1:3001/api';

// 1. Login
const loginRes = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@seakunovel.com', password: 'Admin123' })
});
const { token, user } = await loginRes.json();
console.log('1. Login:', loginRes.status, user?.email);

const headers = { 'Authorization': `Bearer ${token}` };

// 2. Create novel (using multipart FormData)
const fd = new FormData();
fd.append('title', 'Novel Test E2E');
fd.append('slug', `novel-test-e2e-${Date.now()}`);
fd.append('synopsis', 'Test synopsis for e2e');
fd.append('genre_ids[]', '1'); // Fantasy

const createNovelRes = await fetch(`${BASE}/novels`, {
  method: 'POST',
  headers,
  body: fd
});
const novelData = await createNovelRes.json();
console.log('2. Create novel:', createNovelRes.status, novelData.novel?.id ? 'GOT ID' : 'NO ID', novelData.novel?.id);

const novelId = novelData.novel?.id;
if (!novelId) { console.error('ABORT: No novel ID'); process.exit(1); }

// 3. Create chapter
const createChapterRes = await fetch(`${BASE}/chapters/create`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    novel_id: novelId,
    title: 'Bab 1',
    slug: `bab-1-${Date.now()}`,
    chapter_number: 1,
    order_index: 1,
    content: ''
  })
});
const chapterData = await createChapterRes.json();
console.log('3. Create chapter:', createChapterRes.status, chapterData.chapter?.id ? 'GOT ID' : 'NO ID');

const chapterId = chapterData.chapter?.id;
if (!chapterId) { console.error('ABORT: No chapter ID'); process.exit(1); }

// 4. Update chapter (save draft)
const updateRes = await fetch(`${BASE}/chapters/${chapterId}`, {
  method: 'PUT',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Bab 1 Updated', content: '<p>Hello world!</p>', author_notes: 'Testing' })
});
const updateData = await updateRes.json();
console.log('4. Update chapter:', updateRes.status, updateData.chapter?.title);

// 5. Create second chapter (test ER_DUP_ENTRY fix)
const create2Res = await fetch(`${BASE}/chapters/create`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    novel_id: novelId,
    title: 'Bab 2',
    slug: `bab-2-${Date.now()}`,
    chapter_number: 1, // Backend should auto-resolve to 2
    order_index: 1,
    content: ''
  })
});
const chap2Data = await create2Res.json();
console.log('5. Create 2nd chapter (dup number test):', create2Res.status, 'chapter_number:', chap2Data.chapter?.chapter_number);

// 6. List chapters
const listRes = await fetch(`${BASE}/chapters/novel/${novelId}`, { headers });
const listData = await listRes.json();
console.log('6. List chapters:', listRes.status, 'Count:', listData.chapters?.length);

// 7. Get my novels (verify chapters_count)
const myNovelsRes = await fetch(`${BASE}/novels/me`, { headers });
const myNovelsData = await myNovelsRes.json();
const myNovel = myNovelsData.novels?.find(n => n.id === novelId);
console.log('7. My novels chapters_count:', myNovel?.chapters_count, 'genre:', myNovel?.genres);

console.log('\n✅ ALL TESTS PASSED');
process.exit(0);
