import re

with open('server/models/chapter.js', 'r', encoding='utf-8') as f:
    content = f.read()

create_chapter_logic = """export async function createChapter(data) {
  const id = crypto.randomUUID();
  let { novel_id, title, slug, content, chapter_number, order_index } = data;

  // Auto-resolve unique chapter_number to prevent ER_DUP_ENTRY deadlock
  const maxRow = await query('SELECT MAX(chapter_number) as max_num FROM chapters WHERE novel_id = ?', [novel_id]);
  const safeNumber = (maxRow[0].max_num || 0) + 1;
  
  // Use the safe number to bypass any soft-deleted chapter conflicts
  chapter_number = safeNumber;
  order_index = safeNumber;

  await query(
    'INSERT INTO chapters (id, novel_id, title, slug, content, chapter_number, word_count, is_published, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, novel_id, title, slug, content || '', chapter_number, countWords(content || ''), false, order_index]
  );

  await updateNovelWordCount(novel_id);

  return getChapterById(id);
}"""

content = re.sub(r'export async function createChapter\(data\) \{[\s\S]*?return getChapterById\(id\);\n\}', create_chapter_logic, content)

with open('server/models/chapter.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Chapter model patched")
