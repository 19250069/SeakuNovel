import { useEffect, useState } from 'react';
import { bookmarkService } from '../../services/bookmarkService';
import { readingProgressService } from '../../services/readingProgressService';
import { offlineService, type OfflineChapter } from '../../services/offlineService';
import { Link } from 'react-router';
import { BookOpen, Trash2, History, Bookmark, Download, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useDocumentTitle } from '../../utils/seo';

type TabType = 'bookmarks' | 'history' | 'offline';

export function Library() {
  useDocumentTitle('Perpustakaan Saya', 'Koleksi bookmark, riwayat baca, dan bab offline tersimpan di SeakuNovel');
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('bookmarks');

  // Data states
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [offlineChapters, setOfflineChapters] = useState<OfflineChapter[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadData();
  }, [isAuthenticated, activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'bookmarks') {
        const data = await bookmarkService.getAll();
        setBookmarks(data.bookmarks || []);
      } else if (activeTab === 'history') {
        const data = await readingProgressService.getHistory({ limit: 50 });
        setHistory(data.history || []);
      } else if (activeTab === 'offline') {
        const list = await offlineService.getAllSavedChapters();
        setOfflineChapters(list);
      }
    } catch (err) {
      console.error('Failed to load library data', err);
      setError('Gagal memuat data perpustakaan.');
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (novelId: string) => {
    try {
      await bookmarkService.remove(novelId);
      setBookmarks((s) => s.filter((b) => b.novel_id !== novelId));
    } catch (err) {
      console.error('Failed to remove bookmark', err);
    }
  };

  const removeOfflineChapter = async (chapterId: string) => {
    try {
      await offlineService.removeChapter(chapterId);
      setOfflineChapters((s) => s.filter((c) => c.id !== chapterId));
    } catch (err) {
      console.error('Failed to remove offline chapter', err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="py-24 text-center px-4">
        <BookOpen size={48} className="mx-auto mb-4 opacity-30 text-purple-400" />
        <h2 className="text-xl font-bold mb-2">Perpustakaan Anda</h2>
        <p className="text-muted-foreground mb-6">Silakan masuk untuk melihat novel dan riwayat bacaan Anda.</p>
        <Link
          to="/login"
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Masuk
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.75rem', fontWeight: 700 }}>
              Perpustakaan Saya
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Koleksi novel tersimpan, riwayat membaca, dan unduhan offline Anda.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex rounded-xl bg-secondary p-1 border border-border">
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'bookmarks'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bookmark size={14} /> Bookmark ({bookmarks.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'history'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <History size={14} /> Riwayat
            </button>
            <button
              onClick={() => setActiveTab('offline')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'offline'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Download size={14} /> Offline
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-3" />
            <p className="text-sm">Memuat koleksi...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-400 text-sm">{error}</div>
        ) : activeTab === 'bookmarks' ? (
          bookmarks.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground rounded-2xl border border-dashed border-border p-8">
              <Bookmark size={44} className="mx-auto mb-3 opacity-25" />
              <h3 className="font-semibold text-foreground mb-1">Belum Ada Bookmark</h3>
              <p className="text-sm max-w-sm mx-auto mb-4">
                Klik tombol bookmark pada halaman novel favorit untuk menyimpannya di sini.
              </p>
              <Link to="/browse" className="text-sm text-purple-400 hover:text-purple-300">
                Jelajahi Novel
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookmarks.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:border-purple-500/30 transition shadow-sm"
                >
                  <div className="w-16 h-24 shrink-0 rounded-lg overflow-hidden shadow">
                    <ImageWithFallback
                      src={b.novel_cover_url}
                      alt={b.novel_title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/novel/${b.novel_id}`}
                      className="block font-semibold text-foreground hover:text-purple-400 truncate"
                    >
                      {b.novel_title}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      oleh {b.author_username || 'Penulis'}
                    </div>
                    <div className="text-xs text-purple-300 mt-2">
                      Disimpan {new Date(b.created_at).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/novel/${b.novel_id}`}
                      className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs"
                      title="Buka Novel"
                    >
                      <ArrowRight size={16} />
                    </Link>
                    <button
                      onClick={() => removeBookmark(b.novel_id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition"
                      title="Hapus Bookmark"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'history' ? (
          history.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground rounded-2xl border border-dashed border-border p-8">
              <History size={44} className="mx-auto mb-3 opacity-25" />
              <h3 className="font-semibold text-foreground mb-1">Belum Ada Riwayat Bacaan</h3>
              <p className="text-sm max-w-sm mx-auto mb-4">
                Novel yang Anda baca akan otomatis tercatat dan disimpan di sini.
              </p>
              <Link to="/browse" className="text-sm text-purple-400 hover:text-purple-300">
                Mulai Membaca
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:border-purple-500/30 transition shadow-sm"
                >
                  <div className="w-16 h-24 shrink-0 rounded-lg overflow-hidden shadow">
                    <ImageWithFallback
                      src={h.novel_cover_url}
                      alt={h.novel_title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/novel/${h.novel_id}`}
                      className="block font-semibold text-foreground hover:text-purple-400 truncate"
                    >
                      {h.novel_title}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {h.chapter_title ? `Bab ${h.chapter_number}: ${h.chapter_title}` : 'Sedang dibaca'}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span className="text-purple-300 font-semibold">{Math.round(Number(h.progress_percent))}%</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(h.last_read_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  <div>
                    {h.last_chapter_id ? (
                      <Link
                        to={`/read/${h.novel_id}/${h.last_chapter_id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        Lanjut
                      </Link>
                    ) : (
                      <Link
                        to={`/novel/${h.novel_id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs text-foreground hover:bg-secondary/80"
                      >
                        Lihat
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Offline Tab */
          offlineChapters.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground rounded-2xl border border-dashed border-border p-8">
              <Download size={44} className="mx-auto mb-3 opacity-25" />
              <h3 className="font-semibold text-foreground mb-1">Belum Ada Bab Offline</h3>
              <p className="text-sm max-w-sm mx-auto mb-4">
                Saat membaca bab novel, klik tombol "Unduh" untuk menyimpannya agar dapat dibaca tanpa koneksi internet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {offlineChapters.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-purple-500/30 transition"
                >
                  <div className="min-w-0 pr-4">
                    <div className="text-xs uppercase tracking-wider text-purple-400 font-semibold mb-0.5">
                      {ch.novel_title}
                    </div>
                    <div className="font-semibold text-foreground">
                      Bab {ch.chapter_number}: {ch.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Diunduh pada {new Date(ch.saved_at).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/read/${ch.novel_id}/${ch.id}`}
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Baca Offline
                    </Link>
                    <button
                      onClick={() => removeOfflineChapter(ch.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition"
                      title="Hapus Bab Offline"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default Library;
