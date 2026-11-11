import re

with open('src/app/pages/Write.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Chapter Slug uniqueness
chapter_create_logic = r"""
  const createChapter = async () => {
    if (!editing) return;
    try {
      const nextNumber = chapters.length + 1;
      const uniqueSlug = `bab-${nextNumber}-${Date.now()}`;
      const result = await chapterService.create(editing, {
        title: `Bab ${nextNumber}`,
        slug: uniqueSlug,
        chapter_number: nextNumber,
        order_index: nextNumber,
        content: "",
      });
      if (result.chapter) {
        await loadChapters(editing);
        setActiveChapterId(result.chapter.id);
        setChapterTitle(result.chapter.title);
        setChapterContent(result.chapter.content || "");
        setChapterLastSaved(null);
      }
    } catch (error) {
      console.error('Failed to create chapter:', error);
      alert('Gagal membuat bab baru. Silakan coba lagi.');
    }
  };
"""
content = re.sub(r'  const createChapter = async \(\) => \{[\s\S]*?console\.error\(\'Failed to create chapter:\', error\);\n    \}\n  \};\n', lambda m: chapter_create_logic, content)

# Fix 2: Novel Creation genre UUID
novel_create_logic = r"""
  const createNew = async () => {
    if (!newTitle.trim() || !user) return;
    try {
      const genreIds = newGenre ? [newGenre] : [];
      const result = await novelService.create({
        title: newTitle,
        slug: newTitle.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
        synopsis: synopsis,
        genre_ids: genreIds
      }, coverFile || undefined);

      setShowNewModal(false);
      resetNovelForm();
      loadMyNovels();

      // Open the newly created novel with chapter editor
      if (result.novel) {
        setEditing(result.novel.id);
        setActiveChapterId(null);
      }
    } catch (err) {
      console.error('Failed to create novel', err);
      alert('Gagal membuat novel. Periksa console untuk detail.');
    }
  };
"""
content = re.sub(r'  const createNew = async \(\) => \{[\s\S]*?setActiveChapterId\(null\);\n      \}\n    \} catch \(err\) \{[\s\S]*?\}\n  \};\n', lambda m: novel_create_logic, content)

with open('src/app/pages/Write.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Write.tsx patched for bugfixes")
