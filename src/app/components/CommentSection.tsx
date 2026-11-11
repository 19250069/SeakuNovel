import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, Send, Trash2, AlertCircle, RefreshCw, User, Lock, Flag } from "lucide-react";
import { commentService } from "../../services/commentService";
import { useAuth } from "../../contexts/AuthContext";
import { AuthModal } from "./AuthModal";
import { ReportModal } from "./ReportModal";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author_username: string;
  author_display_name: string;
  user_id: string;
}

interface CommentSectionProps {
  reviewId: string | number;
  initialCount: number;
  onCountChange?: (newCount: number) => void;
}

// Constants for time formatting
const TIME_UNITS = {
  MINUTE_MS: 60000,
  HOUR_MS: 3600000,
  DAY_MS: 86400000,
} as const;

const TIME_THRESHOLDS = {
  MINUTE: 1,
  HOUR: 60,
  DAY: 7,
} as const;

// Utility function for date formatting (memoized outside component)
const formatCommentDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const diffMins = Math.floor(diffMs / TIME_UNITS.MINUTE_MS);
  const diffHours = Math.floor(diffMs / TIME_UNITS.HOUR_MS);
  const diffDays = Math.floor(diffMs / TIME_UNITS.DAY_MS);

  if (diffMins < TIME_THRESHOLDS.MINUTE) return "Baru saja";
  if (diffMins < TIME_THRESHOLDS.HOUR) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < TIME_THRESHOLDS.DAY) return `${diffDays} hari lalu`;
  
  return date.toLocaleDateString("id-ID", { 
    day: "numeric", 
    month: "short", 
    year: "numeric" 
  });
};

export function CommentSection({ reviewId, initialCount, onCountChange }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reportingComment, setReportingComment] = useState<{ id: string; author: string } | null>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await commentService.getByReview(reviewId);
      setComments(data.comments || []);
    } catch (err) {
      const error = err as any;
      console.error("Failed to load comments:", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Gagal memuat komentar.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    if (expanded) {
      loadComments();
    }
  }, [expanded, loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedComment = newComment.trim();
    
    if (!trimmedComment) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setSubmitting(true);
    try {
      const result = await commentService.create({
        review_id: reviewId,
        content: trimmedComment,
      });
      
      if (result.comment) {
        setComments((prev) => [...prev, result.comment]);
        setNewComment("");
        onCountChange?.(comments.length + 1);
      }
    } catch (err) {
      const error = err as any;
      console.error("Failed to create comment:", error);
      setError(error?.response?.data?.error || error?.message || "Gagal membuat komentar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeleting(commentId);
    try {
      await commentService.delete(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCountChange?.(comments.length - 1);
    } catch (err) {
      const error = err as any;
      console.error("Failed to delete comment:", error);
      setError(error?.response?.data?.error || error?.message || "Gagal menghapus komentar.");
    } finally {
      setDeleting(null);
    }
  };

  const handleRetry = () => {
    loadComments();
  };

  const toggleExpanded = () => {
    setExpanded((prev) => !prev);
  };

  const handleInputFocus = () => {
    if (!user) {
      setShowAuthModal(true);
    }
  };

  const isCurrentUserComment = useMemo(() => 
    (commentUserId: string) => user?.id === commentUserId,
    [user?.id]
  );

  const canSubmit = useMemo(() => 
    newComment.trim() && !submitting && user,
    [newComment, submitting, user]
  );

  return (
    <div className="mt-4">
      {/* Toggle button */}
      <button
        onClick={toggleExpanded}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition"
        style={{ fontSize: "0.8rem" }}
        aria-expanded={expanded}
        aria-label={expanded ? "Sembunyikan komentar" : `Tampilkan ${initialCount} komentar`}
      >
        <MessageCircle size={14} />
        {initialCount} komentar
        <svg
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 pl-4 border-l-2 border-border">
              {/* Loading state */}
              {loading && (
                <div className="text-center py-4 text-muted-foreground" style={{ fontSize: "0.8rem" }}>
                  <div className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                  Memuat komentar...
                </div>
              )}

              {/* Error state */}
              {error && !loading && (
                <div className="flex items-center gap-2 text-red-400 py-2" role="alert" style={{ fontSize: "0.8rem" }}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                  <button 
                    onClick={handleRetry} 
                    className="ml-auto p-1 hover:bg-secondary rounded transition"
                    aria-label="Coba lagi"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
              )}

              {/* Comment list */}
              {!loading && !error && comments.length === 0 && (
                <div className="text-center py-4 text-muted-foreground" style={{ fontSize: "0.8rem" }}>
                  Belum ada komentar. Jadilah yang pertama!
                </div>
              )}

              {!loading && !error && comments.map((comment) => (
                <div key={comment.id} className="rounded-lg bg-secondary/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="rounded-full bg-gradient-to-br from-purple-500 to-violet-600 p-1.5 flex-shrink-0" 
                        aria-hidden="true"
                      >
                        <User size={12} className="text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold">
                          {comment.author_display_name || comment.author_username}
                        </span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {formatCommentDate(comment.created_at)}
                        </span>
                      </div>
                    </div>
                    {isCurrentUserComment(comment.user_id) ? (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={deleting === comment.id}
                        className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition disabled:opacity-50"
                        title="Hapus komentar"
                        aria-label="Hapus komentar"
                      >
                        {deleting === comment.id ? (
                          <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (!user) {
                            setShowAuthModal(true);
                            return;
                          }
                          setReportingComment({
                            id: comment.id,
                            author: comment.author_display_name || comment.author_username,
                          });
                        }}
                        className="p-1 rounded hover:bg-yellow-500/10 text-muted-foreground hover:text-yellow-400 transition"
                        title="Laporkan komentar"
                        aria-label="Laporkan komentar"
                      >
                        <Flag size={12} />
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-foreground/90 text-sm leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              ))}

              {/* Add comment form */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                {user ? (
                  <div 
                    className="rounded-full bg-gradient-to-br from-purple-500 to-violet-600 p-1.5 flex-shrink-0 self-start mt-1" 
                    aria-hidden="true"
                  >
                    <User size={14} className="text-white" />
                  </div>
                ) : (
                  <div 
                    className="rounded-full bg-muted p-1.5 flex-shrink-0 self-start mt-1" 
                    aria-hidden="true"
                  >
                    <Lock size={14} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 flex gap-2">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={user ? "Tulis komentar..." : "Masuk untuk berkomentar..."}
                    className="flex-1 rounded-lg bg-secondary border border-border px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                    onFocus={handleInputFocus}
                    disabled={submitting}
                    aria-label="Komentar"
                  />
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontSize: "0.8rem" }}
                    aria-label="Kirim komentar"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Silakan masuk untuk menulis komentar."
      />

      {/* Report Modal */}
      {reportingComment && (
        <ReportModal
          isOpen={!!reportingComment}
          onClose={() => setReportingComment(null)}
          targetType="comment"
          targetId={reportingComment.id}
          targetTitle={`Komentar oleh ${reportingComment.author}`}
        />
      )}
    </div>
  );
}