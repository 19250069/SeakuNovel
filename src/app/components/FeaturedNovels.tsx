import { useState, useEffect, memo } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Star, Eye, BookOpen, RefreshCw, AlertCircle } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { novelService } from "../../services/novelService";
import { safeToFixed } from "../../utils/safeNumber";

/** Skeleton card for loading state */
const FeaturedCardSkeleton = memo(function FeaturedCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card" aria-hidden="true">
      <div className="aspect-[3/4] bg-secondary animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-full bg-secondary rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-secondary rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-3 w-12 bg-secondary rounded animate-pulse" />
          <div className="h-3 w-12 bg-secondary rounded animate-pulse" />
          <div className="h-3 w-12 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
});

/** Individual novel card (memoized) */
const FeaturedCard = memo(function FeaturedCard({ novel, index }: { novel: any; index: number }) {
  return (
    <Link key={novel.id} to={`/novel/${novel.id}`} aria-label={`Baca ${novel.title} oleh ${novel.author}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ delay: index * 0.07 }}
        whileHover={{ y: -6 }}
        className="group cursor-pointer rounded-xl overflow-hidden border border-border bg-card transition-all hover:shadow-xl hover:shadow-purple-500/10"
        role="article"
      >
        <div className="aspect-[3/4] relative overflow-hidden">
          <ImageWithFallback src={novel.cover} alt={`Sampul ${novel.title}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <span className="inline-block rounded-full bg-primary/80 px-2 py-0.5 text-white" style={{ fontSize: "0.65rem" }}>{novel.genre}</span>
          </div>
        </div>
        <div className="p-3">
          <h3 style={{ fontFamily: "Lora, serif", fontSize: "0.85rem", fontWeight: 600, lineHeight: 1.3 }} className="mb-1 line-clamp-2">{novel.title}</h3>
          <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground mb-2">{novel.author}</p>
          <div className="flex items-center gap-2 text-muted-foreground" style={{ fontSize: "0.7rem" }}>
            <span className="flex items-center gap-0.5 text-yellow-400" aria-label={`Rating ${novel.rating}`}>
              <Star size={10} fill="currentColor" aria-hidden="true" />{novel.rating}
            </span>
            <span className="flex items-center gap-0.5" aria-label={`${novel.views} dilihat`}><Eye size={10} aria-hidden="true" />{novel.views}</span>
            <span className="flex items-center gap-0.5" aria-label={`${novel.chapters} bab`}><BookOpen size={10} aria-hidden="true" />{novel.chapters}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
});

export function FeaturedNovels() {
  const [novels, setNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeaturedNovels();
  }, []);

  const loadFeaturedNovels = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await novelService.getAll({ status: 'published', sort: 'average_rating', limit: 6 });
      const formatted = (data.novels || []).map((n: any) => ({
        id: n.id || '',
        title: n.title || 'Untitled',
        author: n.author_name || 'Unknown',
        genre: (n.genres && typeof n.genres === 'string' ? n.genres.split(',')[0] : 'Novel') || 'Novel',
        rating: safeToFixed(n.average_rating, 1),
        views: (Number(n.total_views) || 0).toLocaleString(),
        chapters: Number(n.total_chapters) || 0,
        cover: n.cover_url || '',
        color: "border-border",
      }));
      setNovels(formatted);
    } catch (error: any) {
      console.error('Failed to load featured novels:', error);
      setError(error?.message || 'Gagal memuat novel populer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent" aria-labelledby="featured-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 id="featured-heading" style={{ fontFamily: "Cinzel, serif", fontSize: "1.75rem", fontWeight: 600 }} className="mb-2">Novel Populer</h2>
            <p className="text-muted-foreground" style={{ fontSize: "0.9rem" }}>Pilihan terbaik dari komunitas pembaca</p>
          </div>
          <Link to="/browse" className="hidden sm:block rounded-lg border border-border px-4 py-2 text-muted-foreground hover:text-foreground hover:border-purple-500/30 transition" style={{ fontSize: "0.85rem" }}>
            Lihat Semua
          </Link>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5" aria-label="Memuat novel populer..." role="status">
            <span className="sr-only">Memuat novel populer...</span>
            {[...Array(6)].map((_, i) => <FeaturedCardSkeleton key={i} />)}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-16" role="alert">
            <AlertCircle size={48} className="mx-auto mb-4 text-red-400 opacity-70" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <button onClick={loadFeaturedNovels} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition" style={{ fontSize: "0.85rem" }}>
              <RefreshCw size={16} /> Coba Lagi
            </button>
          </div>
        )}

        {/* Novel grid */}
        {!loading && !error && novels.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5" role="list" aria-label="Daftar novel populer">
            {novels.map((n, i) => (
              <div key={n.id} role="listitem">
                <FeaturedCard novel={n} index={i} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && novels.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card/30">
            <BookOpen size={40} className="mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground" style={{ fontSize: "0.9rem" }}>Belum ada novel yang dipublikasikan saat ini.</p>
          </div>
        )}
      </div>
    </section>
  );
}