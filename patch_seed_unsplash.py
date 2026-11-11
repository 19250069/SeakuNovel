import re
with open('server/seed.js', 'r', encoding='utf-8') as f:
    content = f.read()

unsplash_logic = """
    const getKeyword = (title) => {
      const lower = title.toLowerCase();
      if (lower.includes('cinta') || lower.includes('melodi') || lower.includes('surat')) return 'romantic couple aesthetic';
      if (lower.includes('hutan') || lower.includes('misteri') || lower.includes('kematian') || lower.includes('bisikan')) return 'dark forest creepy';
      if (lower.includes('neon') || lower.includes('bintang')) return 'cyberpunk neon city night';
      if (lower.includes('kastil') || lower.includes('legenda') || lower.includes('cahaya') || lower.includes('dunia')) return 'epic fantasy castle';
      if (lower.includes('pengembara') || lower.includes('petualangan')) return 'epic landscape mountain traveler';
      if (lower.includes('perpustakaan')) return 'aesthetic old library books';
      return 'book cover aesthetic';
    };

    const getContextualCover = async (title) => {
      try {
        const keyword = getKeyword(title);
        const res = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(keyword)}&per_page=5`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const rand = Math.floor(Math.random() * Math.min(data.results.length, 5));
          return data.results[rand].urls.regular;
        }
        return 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=1000';
      } catch (err) {
        return 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=1000';
      }
    };
"""

# Replace the previous logic
content = re.sub(r'    function getKeyword\(title\) \{[\s\S]*?const getContextualCover = \(title\) => \{[\s\S]*?\};\n', unsplash_logic, content)

# But wait, in the seed.js it's used synchronously in an INSERT query. 
# `const cover_url = getContextualCover(title);` -> Needs `await`
content = content.replace('const cover_url = getContextualCover(title);', 'const cover_url = await getContextualCover(title);')
# Fix the novel insert logic which I might not have touched
content = content.replace("INSERT INTO novels (id, title, synopsis, author_id, status)", "INSERT INTO novels (id, title, synopsis, author_id, status, cover_url)")
content = content.replace("[novelId, 'Dunia Tersembunyi', 'Sebuah kisah epik tentang penemuan dunia lain di balik bayangan kota.', authorId, 'published']", "[novelId, 'Dunia Tersembunyi', 'Sebuah kisah epik tentang penemuan dunia lain di balik bayangan kota.', authorId, 'published', await getContextualCover('Dunia Tersembunyi')]")

with open('server/seed.js', 'w', encoding='utf-8') as f:
    f.write(content)
