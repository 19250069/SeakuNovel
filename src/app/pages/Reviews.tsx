import { useState, useEffect, useCallback, memo, useMemo } from "react";
import { motion } from "motion/react";
import { Star, ThumbsUp, MessageCircle, User, TrendingUp, AlertCircle, RefreshCw, MessageSquare, Flag } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { reviewService } from "../../services/reviewService";
import { CommentSection } from "../components/CommentSection";
import { ReportModal } from "../components/ReportModal";
import { AuthModal } from "../components/AuthModal";
import { useAuth } from "../../contexts/AuthContext";

// TypeScript interfaces for type safety
interface Review {
  id: string | number;
  user: string;
  date: string;
  novel: string;
  novelCover: string;
  rating: number;
  likes: number;
  comments: number;
  content: string;
}

interface ReviewCardProps {
  review: Review;
  isLiked: boolean;
  onToggleLike: (id: string | number) => void;
  onCommentCountChange: (reviewId: string | number, newCount: number) => void;
  onReportReview: (review: Review) => void;
}

interface ApiReview {
  id: string | number;
  author_username: string;
  created_at: string;
  novel_title: string;
  novel_cover_url: string;
  rating: number;
  likes_count: number;
  comments_count: number;
  content: string;
}

/** Skeleton for loading reviews */
function ReviewSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4" aria-hidden="true">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 bg-secondary rounded animate-pulse" />
          <div className="h-3 w-1/4 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/** Memoized review card with integrated comment section */
const ReviewCard = memo(function ReviewCard({ review, isLiked, onToggleLike, onCommentCountChange, onReportReview }: ReviewCardProps) {
  const handleCommentCountChange = useCallback((newCount: number) => {
    onCommentCountChange(review.id, newCount);
  }, [review.id, onCommentCountChange]);

  const displayLikes = review.likes;

  const renderStars = useMemo(() => {
    return [...Array(5)].map((_, j) => (
      <Star
        key={j}
        size={12}
        className={j < review.rating ? "text-yellow-400" : "text-muted-foreground/30"}
        fill={j < review.rating ? "currentColor" : "none"}
        aria-hidden="true"
      />
    ));
  }, [review.rating]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5 hover:border-purple-500/20 transition"
      role="article"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-full bg-gradient-to-br from-purple-500 to-violet-600 p-2.5" aria-hidden="true">
          <User size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{review.user}</span>
            <span style={{ fontSize: "0.75rem" }} className="text-muted-foreground">{review.date}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5" aria-label={`Rating ${review.rating} dari 5`}>
            {renderStars}
          </div>
        </div>
      </div>

      {/* Novel ref */}
      <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3 mb-4">
        <div className="w-10 h-14 rounded overflow-hidden shrink-0">
          <ImageWithFallback src={review.novelCover} alt={`Sampul ${review.novel}`} className="w-full h-full object-cover" />
        </div>
        <div>
          <div style={{ fontSize: "0.75rem" }} className="text-muted-foreground">Review untuk</div>
          <div style={{ fontFamily: "Lora, serif", fontSize: "0.9rem", fontWeight: 600 }}>{review.novel}</div>
        </div>
      </div>

      {/* Content */}
      <p style={{ fontSize: "0.9rem", lineHeight: 1.7 }} className="text-foreground/90 mb-4">{review.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => onToggleLike(review.id)}
          className={`flex items-center gap-1.5 transition ${isLiked ? "text-purple-400" : "text-muted-foreground hover:text-foreground"}`}
          style={{ fontSize: "0.8rem" }}
          aria-label={isLiked ? "Batal suka" : "Suka review ini"}
        >
          <ThumbsUp size={14} fill={isLiked ? "currentColor" : "none"} aria-hidden="true" />
          {displayLikes}
        </button>
        <div className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: "0.8rem" }}>
          <MessageCircle size={14} aria-hidden="true" /> {review.comments}
        </div>
        <button
          onClick={() => onReportReview(review)}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-red-400 transition ml-auto"
          style={{ fontSize: "0.8rem" }}
          title="Laporkan ulasan"
          aria-label="Laporkan ulasan"
        >
          <Flag size={14} aria-hidden="true" />
          <span>Laporkan</span>
        </button>
      </div>

      {/* Comment Section */}
      <CommentSection
        reviewId={review.id}
        initialCount={review.comments}
        onCountChange={handleCommentCountChange}
      />
    </motion.div>
  );
});

export function Reviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string | number>>(new Set());
  const [reportingReview, setReportingReview] = useState<Review | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const formatReviewData = useCallback((data: { reviews: ApiReview[] }): Review[] => {
    return (data.reviews || []).map((r: ApiReview) => ({
      id: r.id,
      user: r.author_username,
      date: new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      novel: r.novel_title || "Unknown Novel",
      novelCover: r.novel_cover_url || "",
      rating: r.rating,
      likes: r.likes_count || 0,
      comments: r.comments_count || 0,
      content: r.content,
    }));
  }, []);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reviewService.getAll({ sort: "latest" });
      const formatted = formatReviewData(data);
      setReviews(formatted);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Gagal memuat review.";
      console.error("Failed to load reviews:", error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [formatReviewData]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const toggleLike = useCallback(async (id: string | number) => {
    try {
      await reviewService.like(id);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      // Optimistically update the like count without reloading all reviews
      setReviews((prev) =>
        prev.map((review) => {
          if (review.id === id) {
            // Find if it was already liked
            const wasLiked = likedIds.has(id);
            return { ...review, likes: review.likes + (wasLiked ? -1 : 1) };
          }
          return review;
        })
      );
    } catch (error) {
      console.error("Failed to toggle like:", error);
      // Rollback on error
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }
  }, [likedIds]);

  const handleCommentCountChange = useCallback((reviewId: string | number, newCount: number) => {
    setReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId ? { ...review, comments: newCount } : review
      )
    );
  }, []);

  const handleReportReview = useCallback((review: Review) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setReportingReview(review);
  }, [user]);

  const renderContent = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-4" aria-label="Memuat review..." role="status">
          <span className="sr-only">Memuat review...</span>
          {[...Array(3)].map((_, i) => <ReviewSkeleton key={i} />)}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-16" role="alert">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400 opacity-70" />
          <p className="text-muted-foreground mb-2">{error}</p>
          <button
            onClick={loadReviews}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition"
            style={{ fontSize: "0.85rem" }}
          >
            <RefreshCw size={16} /> Coba Lagi
          </button>
        </div>
      );
    }

    if (reviews.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare size={48} className="mx-auto mb-4 opacity-30" aria-hidden="true" />
          <p style={{ fontSize: "1rem" }}>Belum ada review</p>
          <p style={{ fontSize: "0.85rem" }}>Jadilah yang pertama memberikan review</p>
        </div>
      );
    }

    return (
      <div className="space-y-4" role="list" aria-labelledby="reviews-heading">
        {reviews.map((review) => (
          <div key={review.id} role="listitem">
            <ReviewCard
              review={review}
              isLiked={likedIds.has(review.id)}
              onToggleLike={toggleLike}
              onCommentCountChange={handleCommentCountChange}
              onReportReview={handleReportReview}
            />
          </div>
        ))}
      </div>
    );
  }, [loading, error, reviews, likedIds, toggleLike, handleCommentCountChange, handleReportReview, loadReviews]);

  return (
    <div className="py-8 md:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 style={{ fontFamily: "Cinzel, serif", fontSize: "1.75rem", fontWeight: 600 }} className="mb-1" id="reviews-heading">
              Review Novel
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: "0.9rem" }}>Pendapat jujur dari komunitas pembaca</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-muted-foreground" style={{ fontSize: "0.8rem" }}>
            <TrendingUp size={14} aria-hidden="true" /> Terpopuler
          </div>
        </div>

        {renderContent}
      </div>

      {/* Report Modal */}
      {reportingReview && (
        <ReportModal
          isOpen={!!reportingReview}
          onClose={() => setReportingReview(null)}
          targetType="review"
          targetId={String(reportingReview.id)}
          targetTitle={`Review untuk ${reportingReview.novel}`}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Silakan masuk atau buat akun terlebih dahulu untuk melaporkan review."
      />
    </div>
  );
}