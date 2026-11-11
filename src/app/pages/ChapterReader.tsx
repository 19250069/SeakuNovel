import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Settings,
  AlertCircle,
  RefreshCw,
  Lock,
  List,
  Download,
  Check,
  Type,
  Sun,
  Moon,
  BookOpen,
  X,
  Flag,
} from "lucide-react";
import { chapterService } from "../../services/chapterService";
import { novelService } from "../../services/novelService";
import { readingProgressService } from "../../services/readingProgressService";
import { offlineService } from "../../services/offlineService";
import { useAuth } from "../../contexts/AuthContext";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import { AuthModal } from "../components/AuthModal";
import { ReportModal } from "../components/ReportModal";
import { ChapterCommentsDrawer } from "../components/ChapterCommentsDrawer";
import { useDocumentTitle } from "../../utils/seo";

interface ReaderPreferences {
  fontSize: number;
  fontFamily: 'serif' | 'sans' | 'mono';
  lineHeight: number;
  maxWidth: 'narrow' | 'normal' | 'wide';
  theme: 'default' | 'light' | 'dark' | 'sepia';
}

const DEFAULT_PREFERENCES: ReaderPreferences = {
  fontSize: 18,
  fontFamily: 'serif',
  lineHeight: 2.0,
  maxWidth: 'normal',
  theme: 'default',
};

function getStoredPreferences(): ReaderPreferences {
  try {
    const saved = localStorage.getItem('seaku_reader_preferences');
    if (saved) return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
  } catch (_e) {
    // fallback
  }
  return DEFAULT_PREFERENCES;
}

/** Skeleton shown while chapter loads */
function ChapterSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-label="Memuat bab..." role="status">
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div className="h-4 w-20 bg-secondary rounded animate-pulse" />
          <div className="h-4 w-8 bg-secondary rounded animate-pulse" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 md:py-12 space-y-4">
        <div className="h-8 w-2/3 bg-secondary rounded animate-pulse" />
        <div className="h-4 w-1/4 bg-secondary rounded animate-pulse" />
        <div className="space-y-3 mt-8">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-4 w-full bg-secondary rounded animate-pulse"
              style={{ width: `${70 + Math.random() * 30}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Memoized navigation buttons */
const ChapterNav = memo(function ChapterNav({
  prevChapterId,
  nextChapterId,
  novelId,
  onNavigate,
}: {
  prevChapterId: string | null;
  nextChapterId: string | null;
  novelId: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between mt-12 pt-8 border-t border-border">
      <button
        onClick={() => prevChapterId && onNavigate(prevChapterId)}
        disabled={!prevChapterId}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-muted-foreground hover:text-foreground hover:border-purple-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        aria-label={prevChapterId ? 'Bab sebelumnya' : 'Tidak ada bab sebelumnya'}
      >
        <ChevronLeft size={18} aria-hidden="true" /> Sebelumnya
      </button>
      <button
        onClick={() => nextChapterId && onNavigate(nextChapterId)}
        disabled={!nextChapterId}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        aria-label={nextChapterId ? 'Bab selanjutnya' : 'Tidak ada bab selanjutnya'}
      >
        Selanjutnya <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
});

export function ChapterReader() {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [chapter, setChapter] = useState<any>(null);
  const [novel, setNovel] = useState<any>(null);
  useDocumentTitle(
    chapter?.title ? `${chapter.title} - ${novel?.title || "Novel"}` : "Membaca Bab",
    `Baca bab ${chapter?.chapter_number || ""} novel ${novel?.title || ""} di SeakuNovel`
  );
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings & state
  const [prefs, setPrefs] = useState<ReaderPreferences>(getStoredPreferences);
  const [showSettings, setShowSettings] = useState(false);
  const [showChapterDrawer, setShowChapterDrawer] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Inline comments state
  const [inlineComments, setInlineComments] = useState<any[]>([]);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);
  const [isCommentsDrawerOpen, setIsCommentsDrawerOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const progressUpdatedRef = useRef(false);

  // Save preferences to localStorage
  const updatePreferences = (newPrefs: Partial<ReaderPreferences>) => {
    setPrefs((prev) => {
      const updated = { ...prev, ...newPrefs };
      localStorage.setItem('seaku_reader_preferences', JSON.stringify(updated));
      return updated;
    });
  };

  // Check offline status
  useEffect(() => {
    if (chapterId) {
      offlineService.isChapterSaved(chapterId).then(setIsSavedOffline);
    }
  }, [chapterId]);

  // Show auth modal for guest users immediately
  useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true);
    }
  }, [loading, user]);

  const loadChapter = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setError(null);
    try {
      // First try API
      try {
        const data = await chapterService.getById(chapterId);
        setChapter(data.chapter);
        // Record view in the background; store result in localStorage so NovelDetail can pick it up
        chapterService.recordView(chapterId).then((viewRes: any) => {
          if (viewRes?.novel_id && viewRes?.total_views !== undefined) {
            localStorage.setItem(
              `seaku_novel_views_${viewRes.novel_id}`,
              JSON.stringify({ total_views: viewRes.total_views, ts: Date.now() })
            );
          }
        }).catch(console.error);
      } catch (apiErr) {
        // Fallback to offline stored chapter if offline
        const offlineCh = await offlineService.getChapter(chapterId);
        if (offlineCh) {
          setChapter(offlineCh);
        } else {
          throw apiErr;
        }
      }
    } catch (error: any) {
      console.error("Failed to load chapter:", error);
      setError(error?.response?.data?.error || error?.message || 'Gagal memuat bab.');
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  const loadComments = useCallback(async () => {
    if (!chapterId) return;
    try {
      const data = await chapterService.getComments(chapterId);
      if (data && data.comments) {
        setInlineComments(data.comments);
      }
    } catch (err) {
      console.error("Failed to load comments", err);
    }
  }, [chapterId]);

  const loadChaptersList = useCallback(async () => {
    if (!novelId) return;
    try {
      const [chaptersData, novelData] = await Promise.all([
        chapterService.getByNovel(novelId, { limit: 150 }),
        novelService.getById(novelId).catch(() => ({ novel: null })),
      ]);
      setChapters(chaptersData.chapters || []);
      if (novelData?.novel) setNovel(novelData.novel);
    } catch (error) {
      console.error("Failed to load chapters list:", error);
    }
  }, [novelId]);

  useEffect(() => {
    if (chapterId) {
      loadChapter();
      loadComments();
      if (novelId) loadChaptersList();
    }
  }, [chapterId, novelId, loadChapter, loadComments, loadChaptersList]);

  // Restore scroll position from reading progress
  useEffect(() => {
    if (chapter && user && novelId) {
      readingProgressService
        .getProgress(novelId)
        .then((data) => {
          const progress = data?.progress;
          if (progress && progress.last_chapter_id === chapterId && progress.progress_percent > 0 && progress.progress_percent < 98) {
            setTimeout(() => {
              const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
              if (scrollHeight > 0) {
                const targetY = (progress.progress_percent / 100) * scrollHeight;
                window.scrollTo({ top: targetY, behavior: 'smooth' });
              }
            }, 300);
          }
        })
        .catch(() => {});
    }
  }, [chapter, user, novelId, chapterId]);

  // Scroll listener to update reading progress
  useEffect(() => {
    if (chapter && user && novelId) {
      progressUpdatedRef.current = false;
      const handleScroll = () => {
        if (progressUpdatedRef.current) return;

        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollHeight <= 0) return;

        const scrollTop = window.scrollY;
        const percent = Math.min(Math.round((scrollTop / scrollHeight) * 100), 100);

        if (percent % 10 === 0 || percent === 100) {
          readingProgressService
            .updateProgress(novelId, {
              chapter_id: chapterId,
              progress_percent: percent,
            })
            .catch((err) => console.error('Failed to save reading progress:', err));

          if (percent === 100) {
            progressUpdatedRef.current = true;
          }
        }
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [chapter, user, novelId, chapterId]);

  const getCurrentChapterIndex = () => {
    return chapters.findIndex((ch) => ch.id === chapterId);
  };

  const getPreviousChapterId = () => {
    const idx = getCurrentChapterIndex();
    if (idx > 0) return chapters[idx - 1].id;
    return null;
  };

  const getNextChapterId = () => {
    const idx = getCurrentChapterIndex();
    if (idx >= 0 && idx < chapters.length - 1) return chapters[idx + 1].id;
    return null;
  };

  const navigateToChapter = (targetChapterId: string) => {
    if (targetChapterId) {
      navigate(`/read/${novelId}/${targetChapterId}`);
      window.scrollTo(0, 0);
    }
  };

  const handleToggleOffline = async () => {
    if (!chapter) return;
    setSavingOffline(true);
    try {
      if (isSavedOffline) {
        await offlineService.removeChapter(chapter.id);
        setIsSavedOffline(false);
      } else {
        await offlineService.saveChapter(chapter, novel?.title || 'Novel');
        setIsSavedOffline(true);
      }
    } catch (err) {
      console.error('Offline save error:', err);
    } finally {
      setSavingOffline(false);
    }
  };

  if (loading) return <ChapterSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center" role="alert">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400 opacity-70" />
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={loadChapter}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition text-sm"
          >
            <RefreshCw size={16} /> Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Bab tidak ditemukan</p>
          <Link to="/browse" className="text-purple-400 hover:text-purple-300">
            Kembali ke Jelajahi
          </Link>
        </div>
      </div>
    );
  }

  // Determine width class
  const widthClass =
    prefs.maxWidth === 'narrow'
      ? 'max-w-2xl'
      : prefs.maxWidth === 'wide'
      ? 'max-w-4xl'
      : 'max-w-3xl';

  // Determine font family
  const fontFamilyStyle =
    prefs.fontFamily === 'sans'
      ? 'Inter, system-ui, sans-serif'
      : prefs.fontFamily === 'mono'
      ? 'JetBrains Mono, monospace'
      : 'Lora, Georgia, serif';

  // Determine theme styles
  const themeContainerClass =
    prefs.theme === 'sepia'
      ? 'bg-[#f6f1e7] text-[#4a3e36]'
      : prefs.theme === 'light'
      ? 'bg-white text-zinc-900'
      : prefs.theme === 'dark'
      ? 'bg-[#0f0e17] text-[#fffffe]'
      : 'bg-background text-foreground';

  const themeNavClass =
    prefs.theme === 'sepia'
      ? 'bg-[#eae3d2]/90 border-[#dcd2be] text-[#4a3e36]'
      : prefs.theme === 'light'
      ? 'bg-white/95 border-zinc-200 text-zinc-800'
      : prefs.theme === 'dark'
      ? 'bg-[#15141e]/95 border-zinc-800 text-zinc-200'
      : 'bg-card/95 border-border text-foreground';

  const isGuest = !user;
  const prevChapterId = getPreviousChapterId();
  const nextChapterId = getNextChapterId();

  return (
    <div className={`min-h-screen transition-colors duration-200 ${themeContainerClass}`}>
      {/* Sticky Reader Toolbar */}
      <nav
        className={`sticky top-0 z-20 border-b backdrop-blur-sm px-4 py-3 transition-colors ${themeNavClass}`}
        aria-label="Navigasi pembaca"
      >
        <div className={`mx-auto ${widthClass} flex items-center justify-between`}>
          <Link
            to={`/novel/${novelId}`}
            className="flex items-center gap-2 hover:opacity-80 transition text-sm font-medium"
            aria-label="Kembali ke detail novel"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Kembali
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Offline download button */}
            {!isGuest && (
              <button
                onClick={handleToggleOffline}
                disabled={savingOffline}
                className={`p-2 rounded-lg border border-border/50 hover:bg-secondary/40 transition text-xs flex items-center gap-1.5 ${
                  isSavedOffline ? 'text-emerald-500 font-medium' : 'text-muted-foreground'
                }`}
                title={isSavedOffline ? 'Tersimpan Offline (Klik untuk hapus)' : 'Simpan Bab Offline'}
              >
                {isSavedOffline ? <Check size={16} /> : <Download size={16} />}
                <span className="hidden md:inline">{isSavedOffline ? 'Offline' : 'Unduh'}</span>
              </button>
            )}

            {/* Chapter list selector */}
            <button
              onClick={() => setShowChapterDrawer(true)}
              className="p-2 rounded-lg border border-border/50 hover:bg-secondary/40 transition text-sm flex items-center gap-1.5"
              aria-label="Daftar bab"
              title="Daftar Bab"
            >
              <List size={16} />
              <span className="hidden sm:inline">Bab {chapter.chapter_number}</span>
            </button>

            {/* Report button */}
            <button
              onClick={() => {
                if (!user) {
                  setShowAuthModal(true);
                  return;
                }
                setShowReportModal(true);
              }}
              className="p-2 rounded-lg border border-border/50 hover:bg-secondary/40 text-muted-foreground hover:text-red-400 transition"
              aria-label="Laporkan masalah bab"
              title="Laporkan Masalah Bab"
            >
              <Flag size={16} />
            </button>

            {/* Settings button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg border border-border/50 hover:bg-secondary/40 transition"
              aria-label="Pengaturan tampilan membaca"
              title="Pengaturan Tampilan"
            >
              <Settings size={17} />
            </button>
          </div>
        </div>
      </nav>

      {/* Reader Settings Drawer / Popover */}
      {showSettings && (
        <div className="sticky top-14 z-30 mx-auto max-w-lg p-4">
          <div className="rounded-2xl border border-border bg-card/98 p-5 shadow-2xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="font-semibold text-sm flex items-center gap-2">
                <Settings size={16} className="text-purple-400" /> Pengaturan Pembaca
              </span>
              <button
                onClick={() => setShowSettings(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Ukuran Font</span>
                <span className="font-mono">{prefs.fontSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updatePreferences({ fontSize: Math.max(14, prefs.fontSize - 1) })}
                  className="px-3 py-1 rounded border border-border text-sm hover:bg-secondary"
                >
                  A-
                </button>
                <input
                  type="range"
                  min={14}
                  max={28}
                  value={prefs.fontSize}
                  onChange={(e) => updatePreferences({ fontSize: Number(e.target.value) })}
                  className="flex-1 accent-purple-500"
                />
                <button
                  onClick={() => updatePreferences({ fontSize: Math.min(28, prefs.fontSize + 1) })}
                  className="px-3 py-1 rounded border border-border text-sm hover:bg-secondary"
                >
                  A+
                </button>
              </div>
            </div>

            {/* Font Family */}
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Jenis Font</div>
              <div className="grid grid-cols-3 gap-2">
                {(['serif', 'sans', 'mono'] as const).map((font) => (
                  <button
                    key={font}
                    onClick={() => updatePreferences({ fontFamily: font })}
                    className={`py-1.5 text-xs rounded-lg border transition capitalize ${
                      prefs.fontFamily === font
                        ? 'border-purple-500 bg-purple-500/15 text-purple-300 font-semibold'
                        : 'border-border hover:bg-secondary text-muted-foreground'
                    }`}
                  >
                    {font === 'serif' ? 'Serif (Lora)' : font === 'sans' ? 'Sans (Inter)' : 'Mono'}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Mode */}
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Tema Warna</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'default', label: 'Bawaan' },
                  { key: 'light', label: 'Terang' },
                  { key: 'sepia', label: 'Sepia' },
                  { key: 'dark', label: 'Gelap' },
                ].map((th) => (
                  <button
                    key={th.key}
                    onClick={() => updatePreferences({ theme: th.key as any })}
                    className={`py-1.5 text-xs rounded-lg border transition ${
                      prefs.theme === th.key
                        ? 'border-purple-500 bg-purple-500/15 text-purple-300 font-semibold'
                        : 'border-border hover:bg-secondary text-muted-foreground'
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reading Width */}
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Lebar Bacaan</div>
              <div className="grid grid-cols-3 gap-2">
                {(['narrow', 'normal', 'wide'] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => updatePreferences({ maxWidth: w })}
                    className={`py-1 text-xs rounded-lg border transition capitalize ${
                      prefs.maxWidth === w
                        ? 'border-purple-500 bg-purple-500/15 text-purple-300 font-semibold'
                        : 'border-border hover:bg-secondary text-muted-foreground'
                    }`}
                  >
                    {w === 'narrow' ? 'Ringkas' : w === 'normal' ? 'Normal' : 'Lebar'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chapter Selector Drawer / Modal */}
      {showChapterDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm h-full bg-card border-l border-border p-5 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <BookOpen size={18} className="text-purple-400" /> Daftar Bab
              </h3>
              <button onClick={() => setShowChapterDrawer(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {chapters.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    navigateToChapter(ch.id);
                    setShowChapterDrawer(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg text-sm transition flex items-center justify-between ${
                    ch.id === chapterId
                      ? 'bg-primary/20 text-purple-300 font-semibold border border-purple-500/30'
                      : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="truncate mr-2">
                    Bab {ch.chapter_number}: {ch.title}
                  </span>
                  {ch.id === chapterId && <Check size={14} className="shrink-0 text-purple-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Chapter Content */}
      <article className={`mx-auto ${widthClass} px-4 sm:px-6 py-8 md:py-12`} ref={contentRef}>
        <header className="mb-8">
          {novel && (
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              {novel.title}
            </p>
          )}
          <h1
            style={{ fontFamily: fontFamilyStyle, fontSize: `${prefs.fontSize * 1.5}px`, fontWeight: 700 }}
            className="mb-2 leading-tight"
          >
            {chapter.title}
          </h1>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Bab {chapter.chapter_number}</span>
            <span>•</span>
            <span>{chapter.word_count || 0} kata</span>
            {isSavedOffline && (
              <>
                <span>•</span>
                <span className="text-emerald-500 flex items-center gap-1">
                  <Check size={12} /> Tersimpan Offline
                </span>
              </>
            )}
          </div>
        </header>

        {/* Guest Authentication Gate vs Full Reader Content */}
        {isGuest ? (
          <div className="relative mt-8 rounded-2xl border border-border bg-card/60 p-8 text-center backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background pointer-events-none" />
            <div className="relative z-10 max-w-md mx-auto py-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-500/10 mb-4">
                <Lock size={26} className="text-purple-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">Login Diperlukan untuk Membaca</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Silakan masuk atau daftarkan akun baru Anda untuk membaca seluruh bab novel ini.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/login"
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition shadow-sm"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition"
                >
                  Daftar Akun
                </Link>
                <button
                  onClick={() => navigate(`/novel/${novelId}`)}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-secondary transition"
                >
                  Kembali
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              className="prose-reader max-w-none transition-all duration-150"
              style={{
                fontFamily: fontFamilyStyle,
                fontSize: `${prefs.fontSize}px`,
                lineHeight: prefs.lineHeight,
              }}
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(chapter.content),
              }}
            />
            


            {/* Navigation */}
            <ChapterNav
              prevChapterId={prevChapterId}
              nextChapterId={nextChapterId}
              novelId={novelId!}
              onNavigate={navigateToChapter}
            />
          </>
        )}
      </article>

      {/* Auth Modal for guest users attempting chapter interaction */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          navigate(`/novel/${novelId}`);
        }}
        message="Silakan masuk atau daftar akun untuk membaca bab ini."
      />

      {/* Report Modal */}
      {chapter && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="chapter"
          targetId={chapter.id}
          targetTitle={`${novel?.title || 'Novel'} - Bab ${chapter.chapter_number}: ${chapter.title || ''}`}
        />
      )}

      {/* Inline Comments Drawer */}
      <ChapterCommentsDrawer
        isOpen={isCommentsDrawerOpen}
        onClose={() => {
          setIsCommentsDrawerOpen(false);
          setActiveParagraphIndex(null);
        }}
        chapterId={chapterId!}
        paragraphIndex={activeParagraphIndex}
        comments={inlineComments.filter(c => c.paragraph_index === activeParagraphIndex)}
        onCommentAdded={loadComments}
      />
    </div>
  );
}

export default ChapterReader;