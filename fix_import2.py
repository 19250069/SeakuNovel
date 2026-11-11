import re
with open('update_unsplash_covers.js', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('../server/config/db.js', './server/config/db.js')
with open('update_unsplash_covers.js', 'w', encoding='utf-8') as f:
    f.write(content)
