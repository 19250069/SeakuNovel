import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, FileText, Clock, Feather, Save, Eye, ChevronDown, Trash2, Upload, ArrowUp, ArrowDown, Send, Ban, BookOpen, CheckCircle2, AlertCircle, Edit3, X, TrendingUp, ChevronLeft, MoreVertical, Calendar, BarChart3
} from "lucide-react";
import { novelService } from "../../services/novelService";
import { chapterService } from "../../services/chapterService";
import { useAuth } from "../../contexts/AuthContext";
import { RichTextEditor } from "../components/RichTextEditor";
import { useDocumentTitle } from "../../utils/seo";

// ================= TYPES =================
interface Novel {
  id: string; title: string; synopsis: string; cover_url?: string; status: string;
  genre: string; chapters: number; words: number; lastEdited: string;
}
interface Chapter {
  id: string; title: string; content: string; chapter_number: number; is_published: boolean; order_index: number;
  author_notes?: string; word_count?: number;
}
interface Genre { id: string; name: string; }

export function Write() {
  useDocumentTitle("Studio Penulis | SeakuNovel");
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();

  // ================= VIEW STATE =================
  // 'dashboard' | 'editor'
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');

  // ================= DASHBOARD STATE =================
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showNovelModal, setShowNovelModal] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [novelForm, setNovelForm] = useState({ title: '', synopsis: '', genreId: '' });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [editingNovel, setEditingNovel] = useState<Novel | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // ================= EDITOR STATE =================
  const [activeNovel, setActiveNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [trashedChapters, setTrashedChapters] = useState<Chapter[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [authorNotes, setAuthorNotes] = useState("");
  const [isZenMode, setIsZenMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"Tersimpan" | "Menyimpan..." | "Gagal">("Tersimpan");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  
  // Autosave refs for race-condition protection
  const saveSequence = useRef(0);
  const autosaveTimeout = useRef<NodeJS.Timeout | null>(null);

  // ================= INIT =================
  useEffect(() => {
    // Wait until AuthContext has finished loading before checking auth state
    if (isLoading) return;
    if (isAuthenticated) {
      loadNovels();
      loadGenres();
    }
  }, [isAuthenticated, isLoading]);

  const loadNovels = async () => {
    setLoading(true);
    try {
      const data = await novelService.getMyNovels();
      const formatted = (data.novels || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        synopsis: n.synopsis,
        cover_url: n.cover_url,
        status: n.status,
        // genres is a GROUP_CONCAT string e.g. "Romance,Fantasy" — take first value
        genre: n.genres ? n.genres.split(',')[0].trim() : 'Tanpa Genre',
        chapters: parseInt(n.chapters_count, 10) || 0,
        words: parseInt(n.total_words, 10) || 0,
        lastEdited: 'Baru saja',
      }));
      setNovels(formatted);
    } catch (err) {
      console.error('Failed to load novels', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGenres = async () => {
    try {
      const data = await novelService.getGenres();
      setGenres(data.genres || []);
      if (data.genres && data.genres.length > 0) {
        setNovelForm(prev => ({ ...prev, genreId: String(data.genres[0].id) }));
      }
    } catch (err) {}
  };

  const loadChapters = async (novelId: string) => {
    try {
      const data = await chapterService.getByNovel(novelId);
      setChapters(data.chapters || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTrashedChapters = async (novelId: string) => {
    try {
      const data = await chapterService.getTrashed(novelId);
      setTrashedChapters(data.chapters || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ================= ACTIONS: NOVEL =================
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const submitNovel = async () => {
    if (!novelForm.title.trim()) return alert("Judul wajib diisi");
    try {
      const result = await novelService.create({
        title: novelForm.title,
        slug: novelForm.title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
        synopsis: novelForm.synopsis,
        genre_ids: novelForm.genreId ? [novelForm.genreId] : []
      }, coverFile || undefined);

      if (result.novel) {
        setShowNovelModal(false);
        setNovelForm({ title: '', synopsis: '', genreId: genres[0]?.id || '' });
        setCoverFile(null);
        setCoverPreview(null);
        
        // Auto transition to Studio
        const newNovel = {
          id: result.novel.id, title: result.novel.title, synopsis: result.novel.synopsis,
          status: 'draft', genre: '', chapters: 0, words: 0, lastEdited: 'Baru saja'
        };
        setActiveNovel(newNovel);
        setChapters([]);
        setActiveChapterId(null);
        setView('editor');
      }
    } catch (err) {
      console.error(err);
      alert("Gagal membuat novel.");
    }
  };

  const openStudio = async (novel: Novel) => {
    setActiveNovel(novel);
    setActiveChapterId(null);
    setChapterTitle("");
    setChapterContent("");
    setShowTrash(false);
    setView('editor');
    await loadChapters(novel.id);
    await loadTrashedChapters(novel.id);
  };

  const openEditModal = (novel: Novel) => {
    setEditingNovel(novel);
    setNovelForm({
      title: novel.title,
      synopsis: novel.synopsis,
      genreId: genres.find(g => g.name === novel.genre)?.id || genres[0]?.id || ''
    });
    setCoverPreview(novel.cover_url || null);
    setCoverFile(null);
    setShowNovelModal(true);
    setOpenDropdownId(null);
  };

  const submitEditNovel = async () => {
    if (!editingNovel) return;
    if (!novelForm.title.trim()) return alert("Judul wajib diisi");
    try {
      await novelService.update(editingNovel.id, {
        title: novelForm.title,
        slug: novelForm.title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
        synopsis: novelForm.synopsis,
        genre_ids: novelForm.genreId ? [novelForm.genreId] : undefined
      }, coverFile || undefined);
      setShowNovelModal(false);
      setEditingNovel(null);
      loadNovels();
    } catch (err) {
      alert("Gagal mengedit novel");
    }
  };

  const handleDeleteNovel = async (id: string) => {
    if (!confirm("Hapus novel ini secara permanen? Semua bab juga akan terhapus.")) return;
    try {
      await novelService.delete(id);
      loadNovels();
    } catch (err) {
      alert("Gagal menghapus novel");
    }
  };

  const handleTogglePublishNovel = async (novel: Novel) => {
    try {
      if (novel.status === 'published') {
        await novelService.unpublish(novel.id);
      } else {
        await novelService.publish(novel.id);
      }
      loadNovels();
    } catch (err: any) {
      alert(err.response?.data?.error || "Gagal mengubah status novel");
    }
  };

  const openAnalyticsModal = async (novel: Novel) => {
    try {
      const data = await novelService.getAnalytics(novel.id);
      setAnalyticsData({ ...data, novel });
      setShowAnalyticsModal(true);
      setOpenDropdownId(null);
    } catch (err) {
      alert("Gagal memuat statistik");
    }
  };

  // ================= ACTIONS: CHAPTER =================
  const createNewChapter = async () => {
    if (!activeNovel) return;
    try {
      const nextNumber = chapters.length + 1; // Used for UI only, DB auto-resolves max
      const result = await chapterService.create(activeNovel.id, {
        title: `Bab ${nextNumber}`,
        slug: `bab-${nextNumber}-${Date.now()}`,
        chapter_number: nextNumber, 
        order_index: nextNumber,
        content: ""
      });
      if (result.chapter) {
        await loadChapters(activeNovel.id);
        setActiveChapterId(result.chapter.id);
        setChapterTitle(result.chapter.title);
        setChapterContent(result.chapter.content || "");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal membuat bab baru.");
    }
  };

  const selectChapter = (chapter: Chapter) => {
    setActiveChapterId(chapter.id);
    setChapterTitle(chapter.title);
    setChapterContent(chapter.content || "");
    setAuthorNotes(chapter.author_notes || "");
    setHasUnsaved(false);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus bab ini? (Soft Delete)")) return;
    try {
      await chapterService.delete(chapterId);
      showToast("Bab berhasil dihapus");
      if (activeChapterId === chapterId) {
        setActiveChapterId(null);
      }
      if (activeNovel) {
        await loadChapters(activeNovel.id);
        await loadTrashedChapters(activeNovel.id);
      }
    } catch (err) {
      alert("Gagal menghapus bab");
    }
  };

  
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

  const handleRestoreChapter = async (chapterId: string) => {
    try {
      await chapterService.restore(chapterId);
      showToast("Bab berhasil dipulihkan");
      if (activeNovel) {
        await loadChapters(activeNovel.id);
        await loadTrashedChapters(activeNovel.id);
      }
    } catch (err) {
      alert("Gagal memulihkan bab");
    }
  };

  const handleTogglePublishChapter = async (chapterId: string, isPublished: boolean) => {
    try {
      if (hasUnsaved && chapterId === activeChapterId) {
        const saved = await saveChapter();
        if (!saved) return;
      }
      if (isPublished) {
        await chapterService.unpublish(chapterId);
        showToast("Publikasi bab dibatalkan");
      } else {
        await chapterService.publish(chapterId);
        showToast("Bab berhasil dipublikasikan");
      }
      if (activeNovel) {
        await loadChapters(activeNovel.id);
      }
    } catch (err) {
      alert("Gagal mengubah status publikasi bab");
    }
  };

  const handleScheduleChapter = async (chapterId: string) => {
    const dateTime = window.prompt("Masukkan tanggal & waktu rilis (Format: YYYY-MM-DD HH:MM)\nContoh: 2024-12-31 08:00");
    if (!dateTime) return;
    try {
      const publishAt = new Date(dateTime);
      if (isNaN(publishAt.getTime())) {
        return alert("Format waktu tidak valid!");
      }
      await chapterService.schedule(chapterId, publishAt.toISOString());
      showToast("Bab berhasil dijadwalkan");
    } catch (err) {
      alert("Gagal menjadwalkan bab");
    }
  };

  useEffect(() => {
    if (activeChapterId && hasUnsaved) {
      if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
      autosaveTimeout.current = setTimeout(() => {
        saveChapter();
      }, 3000);
    }
    return () => {
      if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
    };
  }, [chapterTitle, chapterContent, authorNotes, activeChapterId, hasUnsaved]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const saveChapter = async (): Promise<boolean> => {
    if (!activeChapterId) return false;
    
    // Capture current sequence
    saveSequence.current += 1;
    const currentSeq = saveSequence.current;
    
    // Abort previous save request if it's still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setSaveStatus("Menyimpan...");
    try {
      await chapterService.update(activeChapterId, {
        title: chapterTitle,
        content: chapterContent,
        author_notes: authorNotes
      }, { signal: abortController.signal });
      
      // Prevent older requests from overwriting UI status if a newer request was sent
      if (saveSequence.current === currentSeq) {
        setSaveStatus("Tersimpan");
        setHasUnsaved(false);
        showToast("Draf Bab Tersimpan");
        // Clear abort controller since we're done and not aborted
        abortControllerRef.current = null;
      }
      
      // Refresh sidebar titles safely
      setChapters(prev => prev.map(c => c.id === activeChapterId ? { ...c, title: chapterTitle, content: chapterContent } : c));
      return true;
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
         console.log('Save aborted for sequence', currentSeq);
         return false; // Silently ignore aborted requests
      }
      if (saveSequence.current === currentSeq) {
        setSaveStatus("Gagal");
        abortControllerRef.current = null;
      }
      return false;
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ================= RENDER =================
  // While auth is still initializing, show nothing (avoid flash of "Login Required")
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in — show login prompt
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Login Diperlukan</h2>
          <p className="text-muted-foreground mb-4">Silakan login untuk mengakses Studio Penulis.</p>
          <button onClick={() => navigate('/login')} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">Masuk</button>
        </div>
      </div>
    );
  }

  // --- VIEW C: CHAPTER WRITING STUDIO ---
  if (view === 'editor' && activeNovel) {
    return (
      <div className="flex h-screen bg-background overflow-hidden relative">
        {/* Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="absolute top-4 left-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">{toastMessage}</span>
              <button onClick={() => { setView('dashboard'); loadNovels(); }} className="ml-3 text-xs underline border-l border-green-400 pl-3 py-0.5 hover:text-green-100">
                Kembali ke Karya Saya
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <div className={`w-64 border-r border-border bg-card/50 flex flex-col transition-transform ${isZenMode ? '-translate-x-full absolute h-full' : ''}`}>
          <div className="p-4 border-b border-border flex items-center justify-between">
            <button onClick={() => { setView('dashboard'); loadNovels(); }} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold text-sm truncate px-2">{activeNovel.title}</span>
          </div>
          <div className="p-3 border-b border-border">
            <button onClick={createNewChapter} className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 py-2 rounded-lg text-sm font-medium transition">
              <Plus size={16} /> Bab Baru
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {showTrash ? (
              trashedChapters.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground mt-4">Tong sampah kosong.</p>
              ) : (
                trashedChapters.map(chap => (
                  <div key={chap.id} className="flex items-center group relative bg-red-500/5 rounded-lg border border-red-500/10">
                    <span className="flex-1 text-left px-3 py-2.5 text-sm text-muted-foreground truncate">{chap.title}</span>
                    <button onClick={() => handleRestoreChapter(chap.id)} className="px-3 text-primary hover:text-primary-foreground hover:bg-primary rounded-r-lg transition h-full absolute right-0 text-xs font-medium border-l border-red-500/10">
                      Pulihkan
                    </button>
                  </div>
                ))
              )
            ) : (
              chapters.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground mt-4">Belum ada bab.</p>
              ) : (
                chapters.map((chap, index) => (
                  <div key={chap.id} className="flex items-center group relative">
                    <div className="flex flex-col gap-0 border-r border-border pr-1 mr-1">
                      <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(index, 'up'); }} disabled={index === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30 p-0.5">
                        <ArrowUp size={12} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(index, 'down'); }} disabled={index === chapters.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30 p-0.5">
                        <ArrowDown size={12} />
                      </button>
                    </div>
                    <button onClick={() => selectChapter(chap)}
                      className={`flex-1 flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-sm transition pr-8 ${activeChapterId === chap.id ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-secondary text-muted-foreground'}`}>
                      <span className="truncate flex-1">{chap.title}</span>
                      {chap.is_published && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 shrink-0" title="Terbit"></span>}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteChapter(chap.id); }} className="absolute right-2 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )
            )}
          </div>
          <div className="p-3 border-t border-border">
            <button onClick={() => setShowTrash(!showTrash)} className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${showTrash ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'text-muted-foreground hover:bg-secondary'}`}>
              <Trash2 size={16} /> {showTrash ? 'Kembali ke Bab' : `Tong Sampah (${trashedChapters.length})`}
            </button>
          </div>
        </div>

        {/* Main Editor */}
        <div className={`flex-1 flex flex-col ${isZenMode ? 'w-full' : ''}`}>
          <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
            <div className="flex-1 flex items-center gap-4">
              {isZenMode && (
                <button onClick={() => setIsZenMode(false)} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft size={20} />
                </button>
              )}
              {activeChapterId ? (
                <input value={chapterTitle} onChange={e => { setChapterTitle(e.target.value); setHasUnsaved(true); }}
                  className="bg-transparent border-none outline-none font-serif text-lg font-semibold w-full" placeholder="Judul bab..." />
              ) : (
                <span className="text-muted-foreground font-serif text-lg">Pilih bab atau buat baru</span>
              )}
            </div>
            {activeChapterId && (
              <div className="flex items-center gap-3">
                <button onClick={() => setIsZenMode(!isZenMode)} className={`p-2 rounded-lg transition ${isZenMode ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-secondary'}`} title="Zen Mode">
                  <Feather size={16} />
                </button>
                <span className={`text-xs ${saveStatus === 'Tersimpan' ? 'text-green-400' : 'text-yellow-400'}`}>{saveStatus}</span>
                <button onClick={saveChapter} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition">
                  <Save size={14} /> Simpan
                </button>
                {chapters.find(c => c.id === activeChapterId)?.is_published ? (
                  <button onClick={() => handleTogglePublishChapter(activeChapterId, true)} className="flex items-center gap-1.5 bg-secondary text-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-secondary/80 transition" title="Batalkan Terbit">
                    <Ban size={14} /> Draf
                  </button>
                ) : (
                  <>
                    <button onClick={() => handleScheduleChapter(activeChapterId)} className="flex items-center gap-1.5 bg-secondary text-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-secondary/80 transition" title="Jadwalkan Terbit">
                      <Calendar size={14} /> Jadwalkan
                    </button>
                    <button onClick={() => handleTogglePublishChapter(activeChapterId, false)} className="flex items-center gap-1.5 bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600 transition" title="Terbitkan Bab">
                      <Send size={14} /> Terbitkan
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {activeChapterId ? (
            <div className="flex-1 overflow-y-auto p-6 md:p-12">
              <div className="max-w-3xl mx-auto">
                <RichTextEditor 
                  content={chapterContent} 
                  onChange={content => { setChapterContent(content); setHasUnsaved(true); }} 
                  onStatsChange={stats => setWordCount(stats.words)}
                  placeholder="Mulai menulis kisahmu di sini..." 
                />
                

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.min(100, (wordCount / 1000) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap"><TrendingUp size={12} className="inline mr-1" /> {wordCount} / 1000 kata</span>
                </div>
                <div className="mt-8 border-t border-border pt-6">
                  <label className="text-sm font-semibold mb-2 block flex items-center gap-2"><BookOpen size={16}/> Catatan Penulis (A/N)</label>
                  <textarea value={authorNotes} onChange={e => { setAuthorNotes(e.target.value); setHasUnsaved(true); }}
                    className="w-full bg-card/50 border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" rows={3} placeholder="Sapa pembaca atau berikan catatan..." />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col">
              <BookOpen size={48} className="mb-4 opacity-30" />
              <p>Pilih bab dari sidebar untuk mulai mengedit</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- VIEW A: MY WORKS DASHBOARD ---
  return (
    <div className="py-8 md:py-12 min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-1">Tulis Novel</h1>
            <p className="text-muted-foreground text-sm">Kelola draf dan karya novelmu</p>
          </div>
          <button onClick={() => {
            setEditingNovel(null);
            setNovelForm({ title: '', synopsis: '', genreId: genres[0]?.id || '' });
            setCoverFile(null);
            setCoverPreview(null);
            setShowNovelModal(true);
          }} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition shadow-lg shadow-purple-500/20">
            <Plus size={18} /> Buat Novel Baru
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"/></div>
        ) : novels.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl bg-card/50">
            <Feather size={56} className="mx-auto mb-4 text-purple-400 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Belum Ada Karya</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Tulis ide brilianmu sekarang dan mulailah perjalananmu sebagai penulis di SeakuNovel.</p>
            <button onClick={() => {
              setEditingNovel(null);
              setNovelForm({ title: '', synopsis: '', genreId: genres[0]?.id || '' });
              setCoverFile(null);
              setCoverPreview(null);
              setShowNovelModal(true);
            }} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition shadow-lg shadow-purple-500/20">
              <Plus size={18} /> Buat Novel Pertamamu
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {novels.map(novel => (
              <div key={novel.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-card border border-border p-5 rounded-2xl hover:border-purple-500/30 transition group">
                <div className="w-16 h-20 rounded-lg bg-secondary overflow-hidden shrink-0">
                  {novel.cover_url ? <img src={novel.cover_url} alt="Cover" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen size={24} className="text-muted-foreground opacity-50"/></div>}
                </div>
                <div className="flex-1">
                  <h3 className="font-serif text-lg font-bold mb-1">{novel.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    <span className="bg-secondary px-2 py-0.5 rounded-full text-foreground">{novel.status.toUpperCase()}</span>
                    <span>{novel.genre}</span>
                    <span>&bull;</span>
                    <span>{novel.chapters} Bab</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{novel.synopsis}</p>
                </div>
                <div className="flex gap-2 relative">
                  <button onClick={() => openStudio(novel)} className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-lg font-medium transition text-sm">
                    Tulis / Edit
                  </button>
                  <button onClick={() => setOpenDropdownId(openDropdownId === novel.id ? null : novel.id)} className="p-2 text-muted-foreground hover:bg-secondary rounded-lg transition">
                    <MoreVertical size={20} />
                  </button>
                  {openDropdownId === novel.id && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-10 py-1">
                      <button onClick={() => openEditModal(novel)} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary flex items-center gap-2">
                        <Edit3 size={16} /> Pengaturan Novel
                      </button>
                      <button onClick={() => openAnalyticsModal(novel)} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary flex items-center gap-2">
                        <BarChart3 size={16} /> Statistik
                      </button>
                      <button onClick={() => handleTogglePublishNovel(novel)} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary flex items-center gap-2">
                        {novel.status === 'published' ? <><Ban size={16}/> Batalkan Terbit</> : <><Save size={16}/> Terbitkan</>}
                      </button>
                      <button onClick={() => handleDeleteNovel(novel.id)} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 flex items-center gap-2 border-t border-border mt-1 pt-2">
                        <Trash2 size={16} /> Hapus Novel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- VIEW B: CREATE NOVEL MODAL --- */}
      <AnimatePresence>
        {showNovelModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowNovelModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-serif text-xl font-bold">{editingNovel ? 'Pengaturan Novel' : 'Novel Baru'}</h2>
                <button onClick={() => setShowNovelModal(false)} className="text-muted-foreground hover:text-foreground"><X size={20}/></button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Cover Novel</label>
                  <label htmlFor="cover-upload" className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition overflow-hidden bg-secondary/50">
                    {coverPreview ? (
                      <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload size={24} className="text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Klik untuk upload cover</span>
                      </>
                    )}
                  </label>
                  <input type="file" id="cover-upload" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Judul Novel</label>
                  <input value={novelForm.title} onChange={e => setNovelForm(p => ({...p, title: e.target.value}))} className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none" placeholder="Masukkan judul..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Genre</label>
                  <select value={novelForm.genreId} onChange={e => setNovelForm(p => ({...p, genreId: e.target.value}))} className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none appearance-none">
                    {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Sinopsis Singkat</label>
                  <textarea value={novelForm.synopsis} onChange={e => setNovelForm(p => ({...p, synopsis: e.target.value}))} className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none resize-none" rows={3} placeholder="Tulis sinopsis cerita..." />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowNovelModal(false)} className="flex-1 py-2.5 border border-border rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition">Batal</button>
                <button onClick={editingNovel ? submitEditNovel : submitNovel} className="flex-1 py-2.5 bg-primary rounded-lg font-medium text-primary-foreground hover:bg-primary/90 transition shadow-md">
                  {editingNovel ? 'Simpan Perubahan' : 'Simpan & Lanjut'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- VIEW D: ANALYTICS MODAL --- */}
      <AnimatePresence>
        {showAnalyticsModal && analyticsData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAnalyticsModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-3xl bg-card border border-border rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-serif text-xl font-bold flex items-center gap-2"><BarChart3 size={20} className="text-purple-400"/> Statistik: {analyticsData.novel.title}</h2>
                <button onClick={() => setShowAnalyticsModal(false)} className="text-muted-foreground hover:text-foreground"><X size={20}/></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Total Pembaca (Views)</div>
                  <div className="text-2xl font-bold text-foreground">{analyticsData.total_views || 0}</div>
                </div>
                <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Pengikut (Followers)</div>
                  <div className="text-2xl font-bold text-foreground">{analyticsData.total_followers || 0}</div>
                </div>
                <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Total Bab Publik</div>
                  <div className="text-2xl font-bold text-foreground">{analyticsData.chapters?.length || 0}</div>
                </div>
              </div>

              <h3 className="font-semibold mb-3">Performa Bab</h3>
              <div className="flex-1 overflow-y-auto border border-border rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary text-muted-foreground sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-medium">Bab</th>
                      <th className="px-4 py-3 font-medium">Judul</th>
                      <th className="px-4 py-3 font-medium text-right">Views</th>
                      <th className="px-4 py-3 font-medium text-right">Komentar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {analyticsData.chapters?.map((ch: any) => (
                      <tr key={ch.id} className="hover:bg-secondary/50">
                        <td className="px-4 py-3">{ch.chapter_number}</td>
                        <td className="px-4 py-3 font-medium truncate max-w-[200px]">{ch.title}</td>
                        <td className="px-4 py-3 text-right">{ch.views}</td>
                        <td className="px-4 py-3 text-right">{ch.comments}</td>
                      </tr>
                    ))}
                    {(!analyticsData.chapters || analyticsData.chapters.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Belum ada data bab</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Write;
