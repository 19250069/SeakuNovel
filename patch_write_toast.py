import re

with open('src/app/pages/Write.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Toast State
toast_state = """  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
"""
content = re.sub(r'  const \[loadingDashboard, setLoadingDashboard\] = useState\(false\);\n', r'  const [loadingDashboard, setLoadingDashboard] = useState(false);\n' + toast_state, content)

# Patch createChapter to use Toast
create_chapter = r"""  const createChapter = async () => {
    if (!editing) return;
    try {
      const nextNumber = chapters.length + 1;
      const uniqueSlug = `bab-${nextNumber}-${Date.now()}`;
      const result = await chapterService.create(editing, {
        title: `Bab ${nextNumber}`,
        slug: uniqueSlug,
        chapter_number: nextNumber, // Backend auto-resolves this now
        order_index: nextNumber,
        content: "",
      });
      if (result.chapter) {
        await loadChapters(editing);
        setActiveChapterId(result.chapter.id);
        setChapterTitle(result.chapter.title);
        setChapterContent(result.chapter.content || "");
        setChapterLastSaved(null);
        showToast('Bab baru berhasil ditambahkan!');
      }
    } catch (error) {
      console.error('Failed to create chapter:', error);
      alert('Gagal membuat bab baru. Silakan coba lagi.');
    }
  };"""
content = re.sub(r'  const createChapter = async \(\) => \{[\s\S]*?console\.error\(\'Failed to create chapter:\', error\);\n      alert\(\'Gagal membuat bab baru\. Silakan coba lagi\.\'\);\n    \}\n  \};\n', lambda m: create_chapter, content)

# Patch saveCurrentChapter to show toast
save_logic = r"""  const saveCurrentChapter = useCallback(async (auto = true) => {
    if (!activeChapterId) return;
    if (auto && !hasUnsavedChanges) return;

    setSaveStatus("Menyimpan...");
    try {
      const payload: any = {
        title: chapterTitle,
        content: chapterContent,
        author_notes: authorNotes,
        author_notes_position: authorNotesPosition
      };

      await chapterService.update(activeChapterId, payload);
      setChapterLastSaved(new Date());
      setSaveStatus("Tersimpan");
      setHasUnsavedChanges(false);
      localStorage.removeItem('currentChapterEditor');
      
      if (!auto) {
        showToast('Draf Bab Tersimpan');
      }
    } catch (error) {
      console.error('Failed to save chapter:', error);
      setSaveStatus("Gagal menyimpan");
    }
  }, [activeChapterId, chapterTitle, chapterContent, hasUnsavedChanges, authorNotes, authorNotesPosition]);"""
content = re.sub(r'  const saveCurrentChapter = useCallback\(async \(auto = true\) => \{[\s\S]*?\}\n  \}, \[activeChapterId, chapterTitle, chapterContent, hasUnsavedChanges, authorNotes, authorNotesPosition\]\);\n', lambda m: save_logic, content)

# Render Toast
toast_ui = """  return (
    <div className="py-8 md:py-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
          >
            <CheckCircle2 size={16} />
            <span className="text-sm font-medium">{toastMessage}</span>
            {toastMessage === 'Draf Bab Tersimpan' && (
               <button onClick={() => setEditing(null)} className="ml-3 underline text-xs hover:text-green-100">Kembali ke Karya</button>
            )}
          </motion.div>
        )}
      </AnimatePresence>"""
content = re.sub(r'  return \(\n    <div className="py-8 md:py-12">', lambda m: toast_ui, content)

# Also fix the editor component root `return` when `editing !== null` to also include the toast
toast_ui_edit = """  if (editing !== null) {
    const activeChapter = chapters.find(c => c.id === activeChapterId);
    const publishedChapters = chapters.filter(c => c.is_published).length;
    const totalChapters = chapters.length;
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Toast Notification for Editor Mode */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="fixed top-4 left-1/2 z-[100] bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">{toastMessage}</span>
              {toastMessage === 'Draf Bab Tersimpan' && (
                 <button onClick={() => setEditing(null)} className="ml-3 underline text-xs hover:text-green-100 border-l border-green-400 pl-3 py-0.5">Kembali ke Karya</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>"""
content = re.sub(r'  if \(editing !== null\) \{\n    const activeChapter = chapters\.find\(c => c\.id === activeChapterId\);\n    const publishedChapters = chapters\.filter\(c => c\.is_published\)\.length;\n    const totalChapters = chapters\.length;\n    return \(\n      <div className="min-h-\[calc\(100vh-4rem\)\] flex flex-col">', lambda m: toast_ui_edit, content)


with open('src/app/pages/Write.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Write.tsx patched for toast and save flow")
