import re

def patch():
    with open('src/app/pages/Write.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add imports
    if 'ArrowUp' not in content:
        content = content.replace('Trash2, Upload', 'Trash2, Upload, ArrowUp, ArrowDown')

    # 2. Add handleMoveChapter inside the component
    # Find a good place, e.g. after handleRestoreChapter
    move_logic = """
  const handleMoveChapter = async (index: number, direction: 'up' | 'down') => {
    const newChapters = [...chapters];
    if (direction === 'up' && index > 0) {
      const temp = newChapters[index];
      newChapters[index] = newChapters[index - 1];
      newChapters[index - 1] = temp;
    } else if (direction === 'down' && index < newChapters.length - 1) {
      const temp = newChapters[index];
      newChapters[index] = newChapters[index + 1];
      newChapters[index + 1] = temp;
    } else {
      return;
    }
    
    const ordered = newChapters.map((ch, i) => ({ ...ch, order_index: i + 1 }));
    setChapters(ordered);
    
    if (activeNovel) {
      try {
        const payload = ordered.map(ch => ({ id: ch.id, order_index: ch.order_index }));
        await chapterService.reorder(activeNovel.id, payload);
      } catch (err) {
        showToast("Gagal menyimpan urutan");
      }
    }
  };
"""
    if 'handleMoveChapter' not in content:
        content = content.replace('const handleRestoreChapter', move_logic + '\n  const handleRestoreChapter')

    # 3. Add UI buttons
    ui_original = """chapters.map(chap => (
                  <div key={chap.id} className="flex items-center group relative">
                    <button onClick={() => selectChapter(chap)}"""
    
    ui_new = """chapters.map((chap, index) => (
                  <div key={chap.id} className="flex items-center group relative">
                    <div className="flex flex-col gap-0 border-r border-border pr-1 mr-1">
                      <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(index, 'up'); }} disabled={index === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30 p-0.5">
                        <ArrowUp size={12} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(index, 'down'); }} disabled={index === chapters.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30 p-0.5">
                        <ArrowDown size={12} />
                      </button>
                    </div>
                    <button onClick={() => selectChapter(chap)}"""
    
    content = content.replace(ui_original, ui_new)

    with open('src/app/pages/Write.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched successfully")

if __name__ == '__main__':
    patch()
