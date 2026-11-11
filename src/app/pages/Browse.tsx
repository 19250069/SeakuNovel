import { useState, useEffect, useCallback, memo } from "react";
import { Link, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { Star, Eye, BookOpen, Search, Filter, Wand2, Sword, Skull, Heart, Rocket, Ghost, BookOpenCheck, Drama, AlertCircle, RefreshCw } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { novelService } from "../../services/novelService";
import { safeToFixed } from "../../utils/safeNumber";
import { useDocumentTitle } from "../../utils/seo";

const genreFilters = [
  { name: "Semua", icon: BookOpen },
  { name: "Fantasy", icon: Wand2 },
  { name: "Adventure", icon: Sword },
  { name: "Thriller", icon: Skull },
  { name: "Romance", icon: Heart },
  { name: "Sci-Fi", icon: Rocket },
  { name: "Horror", icon: Ghost },
  { name: "Slice of Life", icon: BookOpenCheck },
  { name: "Drama", icon: Drama },
];

/** Skeleton card shown while novels are loading */
function NovelCardSkeleton() {
  return (
    <div className="flex gap-4 rounded-xl border border-border bg-card p-4" aria-hidden="true">
      <div className="w-20 md:w-24 shrink-0 rounded-lg overflow-hidden bg-secondary animate-pulse h-28 md:h-32" />
      <div className="flex-1 min-w-0 space-y-3">
        <div className="h-4 w-3/4 bg-secondary rounded animate-pulse" />
        <div className="h-3 w-1/3 bg-secondary rounded animate-pulse" />
        <div className="h-3 w-full bg-secondary rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-secondary rounded animate-pulse" />
        <div className="flex gap-4">
          <div className="h-3 w-12 bg-secondary rounded animate-pulse" />
          <div className="h-3 w-12 bg-secondary rounded animate-pulse" />
          <div className="h-3 w-12 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/** Individual novel card (memoized to avoid re-renders on filter changes) */
const NovelCard = memo(function NovelCard({ novel, index }: { novel: any; index: number }) {
  return (
    <Link key={novel.id} to={`/novel/${novel.id}`} aria-label={`Baca ${novel.title} oleh ${novel.author}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
        className="flex gap-4 rounded-xl border border-border bg-card p-4 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 transition-all cursor-pointer group"
        role="article"
      >
        <div className="w-20 md:w-24 shrink-0 rounded-lg overflow-hidden">
          <ImageWithFallback src={novel.cover_url} alt={`Sampul ${novel.title}`} className="w-full h-28 md:h-32 object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 style={{ fontFamily: "Lora, serif", fontSize: "1rem", fontWeight: 600 }} className="mb-0.5">{novel.title}</h3>
              <p style={{ fontSize: "0.8rem" }} className="text-muted-foreground">oleh {novel.author}</p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-purple-300" style={{ fontSize: "0.7rem" }}>{novel.genre}</span>
          </div>
          <p className="text-muted-foreground mt-2 line-clamp-2" style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>{novel.synopsis}</p>
          <div className="flex items-center gap-4 mt-3 text-muted-foreground" style={{ fontSize: "0.75rem" }}>
            <span className="flex items-center gap-1 text-yellow-400" aria-label={`Rating ${novel.rating}`}><Star size={12} fill="currentColor" /> {novel.rating}</span>
            <span className="flex items-center gap-1" aria-label={`${novel.views} dilihat`}><Eye size={12} /> {novel.views}</span>
            <span className="flex items-center gap-1" aria-label={`${novel.chapters} bab`}><BookOpen size={12} /> {novel.chapters} bab</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
});

export function Browse() {
  useDocumentTitle("Jelajahi Novel", "Temukan dan jelajahi ribuan judul web novel Indonesia dari beragam genre menarik di SeakuNovel.");
  const [novels, setNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGenre, setActiveGenre] = useState("Semua");
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const loadNovels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = searchParams.get("search") || "";
      const data = await novelService.getAll({ status: 'published', search: query });
      const formatted = (data.novels || []).map((n: any) => ({
        id: n.id || '',
        title: n.title || 'Untitled',
        author: n.author_name || 'Unknown',
        genre: (n.genres && typeof n.genres === 'string' ? n.genres.split(',')[0] : 'Novel') || 'Novel',
        rating: safeToFixed(n.average_rating, 1),
        views: (Number(n.total_views) || 0).toLocaleString(),
        chapters: Number(n.total_chapters) || 0,
        synopsis: n.synopsis || '',
        cover_url: n.cover_url || '',
      }));
      setNovels(formatted);
    } catch (error: any) {
      console.error('Failed to load novels:', error);
      setError(error?.response?.data?.error || error?.message || 'Gagal memuat novel. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadNovels();
  }, [loadNovels]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      setSearchParams({ search: search.trim() });
    } else {
      setSearchParams({});
    }
  };

  const filtered = novels.filter((n) => {
    const matchGenre = activeGenre === "Semua" || n.genre === activeGenre;
    return matchGenre;
  });

  return (
    <div className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 style={{ fontFamily: "Cinzel, serif", fontSize: "1.75rem", fontWeight: 600 }} className="mb-2" id="browse-heading">Jelajahi Novel</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.9rem" }}>Temukan cerita yang sempurna untukmu</p>
        </div>

        {/* Search & Filter */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-6" role="search" aria-label="Cari novel">
          <div className="relative flex-1">
            <label htmlFor="search-input" className="sr-only">Cari judul atau penulis</label>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input id="search-input" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul atau penulis..."
              className="w-full rounded-lg bg-secondary border border-border pl-9 pr-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ fontSize: "0.875rem" }} />
          </div>
          <button type="submit" className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 text-muted-foreground hover:text-foreground transition" style={{ fontSize: "0.85rem" }} aria-label="Filter pencarian">
            <Filter size={16} aria-hidden="true" /> Filter
          </button>
        </form>

        {/* Genre tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide" role="tablist" aria-label="Filter genre">
          {genreFilters.map((g) => (
            <button key={g.name} onClick={() => setActiveGenre(g.name)}
              role="tab"
              aria-selected={activeGenre === g.name}
              aria-label={`Genre ${g.name}`}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 transition ${
                activeGenre === g.name
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
              }`} style={{ fontSize: "0.8rem" }}>
              <g.icon size={14} aria-hidden="true" /> {g.name}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-16" role="alert">
            <AlertCircle size={48} className="mx-auto mb-4 text-red-400 opacity-70" />
            <p className="text-foreground mb-2" style={{ fontSize: "1rem" }}>Gagal memuat novel</p>
            <p className="text-muted-foreground mb-4" style={{ fontSize: "0.85rem" }}>{error}</p>
            <button onClick={loadNovels} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition" style={{ fontSize: "0.85rem" }}>
              <RefreshCw size={16} /> Coba Lagi
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-4" aria-label="Memuat novel..." role="status">
            <span className="sr-only">Memuat novel...</span>
            {[...Array(5)].map((_, i) => <NovelCardSkeleton key={i} />)}
          </div>
        )}

        {/* Novel list */}
        {!loading && !error && (
          <div className="grid gap-4" role="list" aria-labelledby="browse-heading">
            {filtered.map((n, i) => (
              <div key={n.id} role="listitem">
                <NovelCard novel={n} index={i} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && !loading && !error && (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen size={48} className="mx-auto mb-4 opacity-30" aria-hidden="true" />
            <p style={{ fontSize: "1rem" }}>Tidak ada novel ditemukan</p>
            <p style={{ fontSize: "0.85rem" }}>Coba kata kunci atau genre lain</p>
          </div>
        )}
      </div>
    </div>
  );
}