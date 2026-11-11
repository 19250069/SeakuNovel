import re
with open('src/app/pages/ChapterReader.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'import { useAuth } from "../context/AuthContext";',
    'import { useAuth } from "../context/AuthContext";\nimport { ChapterCommentsDrawer } from "../components/ChapterCommentsDrawer";'
)

with open('src/app/pages/ChapterReader.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
