import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ArrowLeft, Eye, AlertCircle, RefreshCw, BookOpen } from "lucide-react";
import { chapterService } from "../../services/chapterService";
import { novelService } from "../../services/novelService";
import { sanitizeHtml } from "../../utils/sanitizeHtml";

function PreviewSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-label="Memuat pratinjau..." role="status">
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div className="h-4 w-20 bg-secondary rounded animate-pulse" />
          <div className="h-4 w-24 bg-secondary rounded animate-pulse" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 md:py-12 space-y-4">
        <div className="h-8 w-2/3 bg-secondary rounded animate-pulse" />
        <div className="h-4 w-1/4 bg-secondary rounded animate-pulse" />
        <div className="space-y-3 mt-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-4 w-full bg-secondary rounded animate-pulse" style={{ width: `${70 + Math.random() * 30}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChapterPreview() {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<any>(null);
  const [novel, setNovel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!chapterId || !novelId) return;
    setLoading(true);
    setError(null);
    try {
      const [chapterData, novelData] = await Promise.all([
        chapterService.getById(chapterId),
        novelService.getById(novelId),
      ]);
      setChapter(chapterData.chapter);
      setNovel(novelData.novel);
    } catch (error: any) {
      console.error("Failed to load preview:", error);
      setError(error?.response?.data?.error || error?.message || 'Gagal memuat pratinjau.');
    } finally {
      setLoading(false);
    }
  }, [chapterId, novelId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <PreviewSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center" role="alert">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400 opacity-70" />
          <p className="text-muted-foreground mb-2">{error}</p>
          <button onClick={loadData} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition" style={{ fontSize: "0.85rem" }}>
            <RefreshCw size={16} /> Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!chapter || !novel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-muted-foreground mb-4">Konten tidak ditemukan</p>
          <Link to="/write" className="text-purple-400 hover:text-purple-300">
            Kembali ke Tulis
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Preview toolbar */}
      <nav className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-3" aria-label="Navigasi pratinjau">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <button
            onClick={() => navigate(`/write`)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
            style={{ fontSize: "0.85rem" }}
            aria-label="Kembali ke editor"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Kembali ke Editor
          </button>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
              <Eye size={14} className="text-purple-400" />
              Mode Pratinjau
            </span>
          </div>
        </div>
      </nav>

      {/* Preview banner */}
      <div className="bg-purple-500/10 border-b border-purple-500/20 px-4 py-2">
        <div className="mx-auto max-w-3xl flex items-center gap-2 text-xs text-purple-300">
          <Eye size={14} />
          <span>Ini adalah pratinjau bagaimana pembaca akan melihat bab ini. <strong>{novel.title}</strong> — Bab {chapter.chapter_number}</span>
        </div>
      </div>

      {/* Chapter Content - same renderer as ChapterReader */}
      <article className="mx-auto max-w-3xl px-4 sm:px-6 py-8 md:py-12">
        <header className="mb-8">
          <h1
            style={{ fontFamily: "Lora, serif", fontSize: "1.75rem", fontWeight: 700 }}
            className="mb-2"
          >
            {chapter.title}
          </h1>
          <p style={{ fontSize: "0.85rem" }} className="text-muted-foreground">
            Bab {chapter.chapter_number} &middot; {chapter.word_count || 0} kata
          </p>
        </header>

        <div
          className="prose-reader max-w-none text-foreground/90"
          style={{ fontSize: "18px", lineHeight: 2 }}
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(chapter.content),
          }}
        />

        {/* End of preview indicator */}
        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-muted-foreground text-sm">— Akhir dari pratinjau —</p>
          <button
            onClick={() => navigate(`/write`)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-primary-foreground hover:bg-primary/90 transition"
            style={{ fontSize: "0.85rem" }}
          >
            <ArrowLeft size={16} /> Kembali ke Editor
          </button>
        </div>
      </article>
    </div>
  );
}

export default ChapterPreview;
