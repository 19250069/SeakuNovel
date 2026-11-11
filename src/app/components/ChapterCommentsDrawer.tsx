import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { chapterService } from '../../services/chapterService';

interface Comment {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  content: string;
  created_at: string;
}

interface ChapterCommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  paragraphIndex: number | null;
  comments: Comment[];
  onCommentAdded: () => void;
}

export function ChapterCommentsDrawer({
  isOpen,
  onClose,
  chapterId,
  paragraphIndex,
  comments,
  onCommentAdded
}: ChapterCommentsDrawerProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || paragraphIndex === null) return;
    
    setIsSubmitting(true);
    try {
      await chapterService.addComment(chapterId, paragraphIndex, newComment.trim());
      setNewComment('');
      onCommentAdded();
    } catch (err) {
      console.error('Failed to post comment', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && paragraphIndex !== null && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-card">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  Komentar Paragraf
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Paragraf {paragraphIndex + 1} • {comments.length} komentar
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-secondary text-muted-foreground transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <div className="p-4 rounded-full bg-secondary mb-3">
                    <User size={32} />
                  </div>
                  <p className="text-sm">Belum ada komentar di paragraf ini.<br/>Jadilah yang pertama!</p>
                </div>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.username} className="w-8 h-8 rounded-full object-cover shrink-0 bg-secondary" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                        <User size={16} />
                      </div>
                    )}
                    <div className="flex-1 bg-secondary/50 rounded-2xl rounded-tl-none p-3 relative group">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="font-medium text-sm text-foreground">{c.display_name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-border bg-card">
              {user ? (
                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Tulis komentarmu..."
                    className="flex-1 max-h-32 min-h-[44px] p-3 text-sm bg-secondary border-none focus:ring-1 focus:ring-primary rounded-xl resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition"
                  >
                    <Send size={18} />
                  </button>
                </form>
              ) : (
                <div className="text-center p-3 bg-secondary rounded-xl">
                  <p className="text-sm text-muted-foreground">Silakan masuk untuk berkomentar.</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
