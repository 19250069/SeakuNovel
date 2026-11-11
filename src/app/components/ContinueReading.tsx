import { useEffect, useState } from 'react';
import { readingProgressService } from '../../services/readingProgressService';
import { Link } from 'react-router';
import { BookOpen, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function ContinueReading() {
  const { isAuthenticated } = useAuth();
  const [entry, setEntry] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    readingProgressService
      .continueReading()
      .then((data) => {
        setEntry(data?.progress || data?.entry || null);
      })
      .catch((err) => {
        console.error('Failed to load continue reading', err);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;
  if (loading) return null;
  if (!entry) return null;

  const novelId = entry.novel_id || entry.novel?.id;
  const chapterId = entry.last_chapter_id || entry.chapter_id;
  const novelTitle = entry.novel_title || entry.novel?.title || 'Novel';
  const coverUrl = entry.novel_cover_url || entry.novel?.cover_url;
  const chapterTitle = entry.chapter_title || (entry.chapter_number ? `Bab ${entry.chapter_number}` : 'Lanjutkan Bab');
  const percent = Math.round(Number(entry.progress_percent) || 0);

  if (!novelId || !chapterId) return null;

  return (
    <section className="py-6 md:py-8" aria-label="Lanjutkan Membaca">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-lg flex flex-col sm:flex-row items-center gap-5 hover:border-purple-500/30 transition">
          <div className="w-16 h-24 shrink-0 rounded-lg overflow-hidden shadow">
            <ImageWithFallback
              src={coverUrl}
              alt={novelTitle}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="text-xs uppercase tracking-wider font-semibold text-purple-400 mb-1 flex items-center justify-center sm:justify-start gap-1.5">
              <BookOpen size={14} /> Lanjutkan Membaca
            </div>
            <Link
              to={`/read/${novelId}/${chapterId}`}
              className="text-lg font-bold hover:text-purple-400 transition"
            >
              {novelTitle} — {chapterTitle}
            </Link>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center sm:justify-start gap-2">
              <span className="flex items-center gap-1">
                <Clock size={12} /> {new Date(entry.last_read_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </span>
              <span>•</span>
              <span className="text-purple-300 font-medium">{percent}% terbaca</span>
            </div>
          </div>
          <div>
            <Link
              to={`/read/${novelId}/${chapterId}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition shadow-sm"
            >
              Lanjutkan
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContinueReading;
