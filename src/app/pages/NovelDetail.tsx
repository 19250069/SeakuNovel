import { useState, useEffect, useCallback, memo } from "react";
import { useParams, Link } from "react-router";
import { motion } from "motion/react";
import {
  Star,
  Eye,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ArrowLeft,
  Share2,
  AlertCircle,
  RefreshCw,
  Lock,
  Bell,
  UserPlus,
  UserCheck,
  ThumbsUp,
  Trash2,
  MessageSquare,
  Flag,
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { novelService } from "../../services/novelService";
import { chapterService } from "../../services/chapterService";
import { bookmarkService } from "../../services/bookmarkService";
import { reviewService } from "../../services/reviewService";
import { followService } from "../../services/followService";
import { readingProgressService } from "../../services/readingProgressService";
import { useAuth } from "../../contexts/AuthContext";
import { safeToFixed } from "../../utils/safeNumber";
import { AuthModal } from "../components/AuthModal";
import { ReportModal } from "../components/ReportModal";
import { useDocumentTitle } from "../../utils/seo";

/** Skeleton shown while novel details load */
function NovelDetailSkeleton() {
  return (
    <div className="py-8 md:py-12" aria-label="Memuat detail novel..." role="status">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="h-4 w-20 bg-secondary rounded animate-pulse mb-6" />
        <div className="flex gap-6 md:gap-8 mb-10">
          <div className="w-32 md:w-48 shrink-0 rounded-xl overflow-hidden bg-secondary animate-pulse aspect-[3/4]" />
          <div className="flex-1 space-y-4">
            <div className="h-8 w-3/4 bg-secondary rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-secondary rounded animate-pulse" />
            <div className="flex gap-4">
              <div className="h-4 w-16 bg-secondary rounded animate-pulse" />
              <div className="h-4 w-16 bg-secondary rounded animate-pulse" />
              <div className="h-4 w-16 bg-secondary rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-secondary rounded animate-pulse" />
              <div className="h-3 w-full bg-secondary rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-secondary rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Memoized chapter list item — shows auth modal for guests */
const ChapterItem = memo(function ChapterItem({
  chapter,
  index,
  novelId,
  onStartReading,
  isGuest,
}: {
  chapter: any;
  index: number;
  novelId: string;
  onStartReading: (id: string) => void;
  isGuest: boolean;
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (isGuest) {
      e.preventDefault();
      onStartReading(chapter.id);
    }
  };

  return (
    <Link
      to={isGuest ? '#' : `/read/${novelId}/${chapter.id}`}
      onClick={handleClick}
      className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-purple-500/30 hover:shadow-md transition group"
      aria-label={isGuest ? `Bab ${index + 1}: ${chapter.title} (perlu login)` : `Baca bab ${index + 1}: ${chapter.title}`}
    >
      <div className="flex items-center gap-4">
        <span className="text-muted-foreground" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
          #{index + 1}
        </span>
        <div>
          <h3
            style={{ fontFamily: "Lora, serif", fontSize: "0.95rem", fontWeight: 600 }}
            className="group-hover:text-purple-400 transition"
          >
            {chapter.title}
          </h3>
          <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground">
            {chapter.word_count || 0} kata
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isGuest && <Lock size={14} className="text-muted-foreground" aria-label="Perlu login" />}
        <BookOpen
          size={18}
          className="text-muted-foreground group-hover:text-purple-400 transition"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
});

export function NovelDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [novel, setNovel] = useState<any>(null);
  useDocumentTitle(
    novel?.title ? `${novel.title} - Novel oleh ${novel.author_name || novel.author || "Penulis"}` : "Detail Novel",
    novel?.synopsis || "Baca bab dan ulasan novel menarik di SeakuNovel"
  );
  const [chapters, setChapters] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bookmark state
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  // Follow states
  const [isFollowingNovel, setIsFollowingNovel] = useState(false);
  const [novelFollowersCount, setNovelFollowersCount] = useState(0);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);

  // Review submission state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Auth & Report modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState("");
  const [reportModalTarget, setReportModalTarget] = useState<{
    type: "novel" | "review";
    id: string;
    title?: string;
  } | null>(null);

  const loadNovel = useCallback(async () => {
    if (!id) return;
    try {
      const data = await novelService.getById(id);
      setNovel(data.novel);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setNovel(null);
      } else {
        console.error('Failed to load novel:', error);
        setError(error?.response?.data?.error || error?.message || 'Gagal memuat novel.');
      }
    }
  }, [id]);

  const loadChapters = useCallback(async () => {
    if (!id) return;
    try {
      const data = await chapterService.getByNovel(id);
      setChapters(data.chapters || []);
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error('Failed to load chapters:', error);
      }
    }
  }, [id]);

  const loadReviews = useCallback(async () => {
    if (!id) return;
    try {
      const data = await reviewService.getByNovel(id);
      setReviews(data.reviews || []);
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error('Failed to load reviews:', error);
      }
    }
  }, [id]);

  const checkBookmark = useCallback(async () => {
    if (!user || !id) return;
    try {
      const statusData = await bookmarkService.checkStatus(id);
      setIsBookmarked(statusData.bookmarked || false);
    } catch (error) {
      console.error('Failed to check bookmark:', error);
    }
  }, [user, id]);

  const checkFollowStatus = useCallback(async () => {
    if (!id) return;
    try {
      const novelFollowData = await followService.checkStatus('novel', id);
      setIsFollowingNovel(novelFollowData.followed || false);
      setNovelFollowersCount(novelFollowData.followers_count || 0);

      if (novel?.author_id) {
        const authorFollowData = await followService.checkStatus('author', novel.author_id);
        setIsFollowingAuthor(authorFollowData.followed || false);
      }
    } catch (error) {
      console.error('Failed to check follow status:', error);
    }
  }, [id, novel?.author_id]);

  useEffect(() => {
    if (id) {
      setLoading(true);
      setError(null);
      Promise.all([loadNovel(), loadChapters(), loadReviews()]).finally(() => setLoading(false));
      if (user) checkBookmark();
    }
  }, [id, user, loadNovel, loadChapters, loadReviews, checkBookmark]);

  // Smart realtime: watch localStorage for view updates written by ChapterReader,
  // and also poll loadNovel() every 15s as a fallback for cross-user rating changes.
  useEffect(() => {
    if (!id || !novel) return;

    const storageKey = `seaku_novel_views_${id}`;

    // Check localStorage for view count written by ChapterReader
    const checkLocalStorage = () => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const { total_views, ts } = JSON.parse(raw);
        // Only apply if data is fresh (within last 10s)
        if (Date.now() - ts < 10000) {
          setNovel((prev: any) => {
            if (prev && prev.total_views !== total_views) {
              return { ...prev, total_views };
            }
            return prev;
          });
        }
      } catch (e) { /* ignore */ }
    };

    const fastInterval = setInterval(checkLocalStorage, 1000); // Check every 1s for view updates
    const slowInterval = setInterval(() => {
      loadNovel().catch(console.error);
    }, 15000); // Full refresh every 15s for cross-user rating changes

    return () => {
      clearInterval(fastInterval);
      clearInterval(slowInterval);
    };
  }, [id, novel, loadNovel]);

  useEffect(() => {
    if (id && novel) {
      checkFollowStatus();
    }
  }, [id, novel, checkFollowStatus]);

  const toggleBookmark = async () => {
    if (!user || !id) {
      setAuthModalMessage("Silakan masuk untuk menyimpan novel ke bookmark.");
      setShowAuthModal(true);
      return;
    }
    try {
      await bookmarkService.toggle(id);
      setIsBookmarked(!isBookmarked);
      setBookmarkCount((prev) => (isBookmarked ? prev - 1 : prev + 1));
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const toggleNovelFollow = async () => {
    if (!user || !id) {
      setAuthModalMessage("Silakan masuk untuk mengikuti pembaruan novel ini.");
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await followService.toggle('novel', id);
      setIsFollowingNovel(res.followed);
      setNovelFollowersCount(res.followers_count);
    } catch (error) {
      console.error('Failed to toggle novel follow:', error);
    }
  };

  const toggleAuthorFollow = async () => {
    if (!user || !novel?.author_id) {
      setAuthModalMessage("Silakan masuk untuk mengikuti penulis ini.");
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await followService.toggle('author', novel.author_id);
      setIsFollowingAuthor(res.followed);
    } catch (error) {
      console.error('Failed to toggle author follow:', error);
    }
  };

  const startReading = (chapterId: string) => {
    if (!user) {
      setAuthModalMessage("Silakan masuk untuk mulai membaca bab.");
      setShowAuthModal(true);
      return;
    }
    if (id) {
      readingProgressService
        .updateProgress(id, {
          chapter_id: chapterId,
          progress_percent: 0,
        })
        .catch((err) => console.error('Failed to update reading progress:', err));
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthModalMessage("Silakan masuk untuk menulis ulasan.");
      setShowAuthModal(true);
      return;
    }
    if (!reviewTitle.trim() || !reviewContent.trim()) {
      alert("Harap isi judul dan konten ulasan.");
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await reviewService.create({
        novel_id: novel.id,
        user_id: user.id,
        rating: reviewRating,
        title: reviewTitle.trim(),
        content: reviewContent.trim(),
      });
      alert("Ulasan Anda berhasil dikirim!");
      setReviewTitle("");
      setReviewContent("");
      setReviewRating(5);
      // Immediately update novel stats from authoritative server response — no refresh needed
      if (res?.novelStats) {
        setNovel((prev: any) => prev ? {
          ...prev,
          average_rating: res.novelStats.average_rating,
          rating_count: res.novelStats.rating_count,
          total_views: res.novelStats.total_views,
        } : prev);
      }
      loadReviews();
      loadNovel(); // Still call for safety — ensures full sync
    } catch (err: any) {
      console.error('Failed to submit review', err);
      alert(err.response?.data?.error || "Gagal mengirim ulasan.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Hapus ulasan ini?")) return;
    try {
      await reviewService.delete(reviewId);
      loadReviews();
      loadNovel();
    } catch (err) {
      console.error("Failed to delete review", err);
    }
  };

  const handleLikeReview = async (reviewId: string) => {
    if (!user) {
      setAuthModalMessage("Silakan masuk untuk menyukai ulasan.");
      setShowAuthModal(true);
      return;
    }
    try {
      await reviewService.like(reviewId);
      loadReviews();
    } catch (err) {
      console.error("Failed to like review", err);
    }
  };

  if (loading) return <NovelDetailSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center" role="alert">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400 opacity-70" />
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              Promise.all([loadNovel(), loadChapters(), loadReviews()]).finally(() =>
                setLoading(false)
              );
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition text-sm"
          >
            <RefreshCw size={16} /> Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Novel tidak ditemukan</p>
          <Link to="/browse" className="text-purple-400 hover:text-purple-300">
            Kembali ke Jelajahi
          </Link>
        </div>
      </div>
    );
  }

  const isGuest = !user;

  return (
    <div className="py-8 md:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Link
          to="/browse"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"
          aria-label="Kembali ke halaman jelajah"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke Jelajah
        </Link>

        {/* Top Novel Details Section */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-12">
          <div className="w-36 md:w-52 shrink-0 rounded-2xl overflow-hidden shadow-2xl mx-auto md:mx-0">
            <ImageWithFallback
              src={novel.cover_url}
              alt={`Sampul ${novel.title}`}
              className="w-full aspect-[3/4] object-cover"
            />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1
              style={{ fontFamily: "Lora, serif", fontSize: "1.85rem", fontWeight: 700 }}
              className="mb-2 leading-tight"
            >
              {novel.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4 text-sm text-muted-foreground">
              <span>
                oleh{' '}
                <Link
                  to={`/profile/${novel.author_id}`}
                  className="font-medium text-foreground hover:text-purple-400 underline decoration-purple-500/40"
                >
                  {novel.author_name || 'Penulis'}
                </Link>
              </span>

              {/* Author Follow Button */}
              <button
                onClick={toggleAuthorFollow}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition ${
                  isFollowingAuthor
                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-purple-500/30'
                }`}
              >
                {isFollowingAuthor ? <UserCheck size={13} /> : <UserPlus size={13} />}
                {isFollowingAuthor ? 'Mengikuti Penulis' : 'Ikuti Penulis'}
              </button>
            </div>

            {/* Metrics */}
            <div className="flex items-center justify-center md:justify-start gap-5 mb-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                <Star size={16} fill="currentColor" aria-hidden="true" />{' '}
                {safeToFixed(novel.average_rating, 1)}
                {novel.rating_count > 0 && (
                  <span className="text-xs font-normal text-muted-foreground ml-0.5">
                    ({novel.rating_count})
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <Eye size={16} /> {novel.total_views || 0} dilihat
              </span>
              <span className="flex items-center gap-1">
                <BookOpen size={16} /> {chapters.length || novel.total_chapters || 0} bab
              </span>
            </div>

            {/* Synopsis */}
            <p className="text-foreground/80 mb-6 text-sm leading-relaxed max-w-2xl mx-auto md:mx-0">
              {novel.synopsis}
            </p>

            {/* Genres */}
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-6">
              {(novel.genres && typeof novel.genres === 'string'
                ? novel.genres.split(',')
                : []
              ).map((genre: string) => (
                <span
                  key={genre}
                  className="rounded-full bg-primary/15 px-3 py-1 text-purple-300 text-xs font-medium"
                >
                  {genre.trim()}
                </span>
              ))}
            </div>

            {/* Actions: Read First Chapter, Bookmark, Follow Novel, Report, Share */}
            <div className="flex flex-wrap justify-center md:justify-start gap-2.5">
              {chapters.length > 0 && (
                <Link
                  to={isGuest ? '#' : `/read/${novel.id}/${chapters[0].id}`}
                  onClick={(e) => {
                    if (isGuest) {
                      e.preventDefault();
                      startReading(chapters[0].id);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition shadow-md"
                >
                  <BookOpen size={16} /> Baca Bab 1
                </Link>
              )}

              <button
                onClick={toggleBookmark}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition border ${
                  isBookmarked
                    ? "bg-purple-600 border-purple-500 text-white shadow-sm"
                    : "bg-secondary border-border text-foreground hover:border-purple-500/30"
                }`}
              >
                {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                {isBookmarked ? 'Tersimpan' : 'Simpan'}
              </button>

              <button
                onClick={toggleNovelFollow}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition border ${
                  isFollowingNovel
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                    : 'bg-secondary border-border text-foreground hover:border-purple-500/30'
                }`}
              >
                <Bell size={16} />
                {isFollowingNovel ? 'Mengikuti' : 'Ikuti Novel'}{' '}
                {novelFollowersCount > 0 && `(${novelFollowersCount})`}
              </button>

              <button
                onClick={() => {
                  if (!user) {
                    setAuthModalMessage('Silakan masuk untuk melaporkan konten.');
                    setShowAuthModal(true);
                    return;
                  }
                  setReportModalTarget({
                    type: 'novel',
                    id: novel.id,
                    title: novel.title,
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2.5 text-xs text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition"
              >
                <Flag size={13} /> Laporkan
              </button>
            </div>
          </div>
        </div>

        {/* Chapters Section */}
        <div className="border-t border-border pt-10 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ fontFamily: "Cinzel, serif", fontSize: "1.4rem", fontWeight: 700 }}>
              Daftar Bab ({chapters.length})
            </h2>
          </div>

          {chapters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground rounded-2xl border border-dashed border-border">
              <BookOpen size={44} className="mx-auto mb-3 opacity-30" />
              <p>Belum ada bab yang diterbitkan untuk novel ini.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {chapters.map((chapter, index) => (
                <div key={chapter.id}>
                  <ChapterItem
                    chapter={chapter}
                    index={index}
                    novelId={novel.id}
                    onStartReading={startReading}
                    isGuest={isGuest}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="border-t border-border pt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ fontFamily: "Cinzel, serif", fontSize: "1.4rem", fontWeight: 700 }}>
              Ulasan Pembaca ({reviews.length})
            </h2>
          </div>

          {/* Write Review Form */}
          <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm mb-8">
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <MessageSquare size={18} className="text-purple-400" /> Tulis Ulasan Anda
            </h3>

            {user ? (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Rating Bintang (1 - 5)
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 hover:scale-110 transition"
                      >
                        <Star
                          size={24}
                          className={
                            star <= reviewRating
                              ? 'text-yellow-400'
                              : 'text-muted-foreground/30'
                          }
                          fill={star <= reviewRating ? 'currentColor' : 'none'}
                        />
                      </button>
                    ))}
                    <span className="text-sm font-semibold ml-2 text-foreground">
                      {reviewRating} / 5
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Judul Ulasan
                  </label>
                  <input
                    type="text"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    placeholder="Contoh: Alur cerita sangat memukau!"
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Konten Ulasan
                  </label>
                  <textarea
                    rows={4}
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    placeholder="Bagikan pendapat Anda mengenai penokohan, dunia cerita, dan alur plot..."
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
                  >
                    {submittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                <p className="text-sm mb-3">
                  Silakan masuk untuk membagikan ulasan dan rating Anda untuk novel ini.
                </p>
                <button
                  onClick={() => {
                    setAuthModalMessage('Silakan masuk untuk menulis ulasan.');
                    setShowAuthModal(true);
                  }}
                  className="rounded-lg bg-primary px-5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition"
                >
                  Masuk untuk Menulis Ulasan
                </button>
              </div>
            )}
          </div>

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground rounded-2xl border border-dashed border-border p-6">
              <p className="text-sm">Belum ada ulasan untuk novel ini. Jadilah pembaca pertama yang mengulas!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-foreground">
                          {rev.author_name || rev.author_username || rev.display_name || 'Pembaca'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(rev.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={
                              i < rev.rating ? 'text-yellow-400' : 'text-muted-foreground/30'
                            }
                            fill={i < rev.rating ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Delete review if owner or admin */}
                    {(user?.id === rev.user_id || user?.role === 'admin') && (
                      <button
                        onClick={() => handleDeleteReview(rev.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition"
                        title="Hapus Ulasan"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {rev.title && (
                    <h4 className="font-semibold text-sm text-foreground">{rev.title}</h4>
                  )}

                  <p className="text-sm text-foreground/80 leading-relaxed">{rev.content}</p>

                  <div className="flex items-center gap-4 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                    <button
                      onClick={() => handleLikeReview(rev.id)}
                      className="flex items-center gap-1.5 hover:text-purple-400 transition"
                    >
                      <ThumbsUp size={14} /> {rev.likes_count || 0} Suka
                    </button>
                    {user?.id !== rev.user_id && (
                      <button
                        onClick={() => {
                          if (!user) {
                            setAuthModalMessage('Silakan masuk untuk melaporkan ulasan.');
                            setShowAuthModal(true);
                            return;
                          }
                          setReportModalTarget({
                            type: 'review',
                            id: String(rev.id),
                            title: rev.title ? `Ulasan: ${rev.title}` : `Ulasan untuk ${novel.title}`,
                          });
                        }}
                        className="flex items-center gap-1.5 hover:text-red-400 transition ml-auto"
                        title="Laporkan Ulasan"
                      >
                        <Flag size={13} /> Laporkan
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Auth Modal for guest actions */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message={authModalMessage}
      />

      {/* Report Modal */}
      {reportModalTarget && (
        <ReportModal
          isOpen={!!reportModalTarget}
          onClose={() => setReportModalTarget(null)}
          targetType={reportModalTarget.type}
          targetId={reportModalTarget.id}
          targetTitle={reportModalTarget.title}
        />
      )}
    </div>
  );
}

export default NovelDetail;