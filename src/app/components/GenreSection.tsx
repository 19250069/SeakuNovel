import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sword, Wand2, Skull, Heart, Rocket, Ghost, BookOpenCheck, Drama } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { novelService } from "../../services/novelService";

// Static metadata per genre (icon, color) — count comes from API
const GENRE_META: Record<string, { icon: React.ElementType; color: string }> = {
  Fantasy:       { icon: Wand2,          color: "from-violet-600 to-purple-700" },
  Adventure:     { icon: Sword,          color: "from-amber-600 to-orange-700" },
  Thriller:      { icon: Skull,          color: "from-red-600 to-rose-800" },
  Romance:       { icon: Heart,          color: "from-pink-500 to-rose-600" },
  "Sci-Fi":      { icon: Rocket,         color: "from-cyan-500 to-blue-700" },
  Horror:        { icon: Ghost,          color: "from-gray-700 to-gray-900" },
  "Slice of Life":{ icon: BookOpenCheck, color: "from-emerald-500 to-teal-700" },
  Drama:         { icon: Drama,          color: "from-indigo-500 to-purple-700" },
};

const DEFAULT_COLOR = "from-purple-600 to-indigo-700";

export function GenreSection() {
  const [genres, setGenres] = useState<any[]>([]);

  useEffect(() => {
    novelService.getGenres().then((data: any) => {
      const list = (data?.genres || data || []).map((g: any) => ({
        ...g,
        meta: GENRE_META[g.name] || { icon: BookOpenCheck, color: DEFAULT_COLOR },
      }));
      setGenres(list);
    }).catch(console.error);
  }, []);

  // While loading, show placeholders with the same grid layout
  const display = genres.length > 0
    ? genres
    : Object.entries(GENRE_META).map(([name, meta]) => ({ name, meta, novel_count: null }));

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 style={{ fontFamily: "Cinzel, serif", fontSize: "1.75rem", fontWeight: 600 }} className="mb-3">
            Jelajahi Genre
          </h2>
          <p className="text-muted-foreground" style={{ fontSize: "0.95rem" }}>
            Pilih genre favoritmu dan temukan cerita yang tepat
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {display.map((g, i) => {
            const Icon = g.meta?.icon || BookOpenCheck;
            const color = g.meta?.color || DEFAULT_COLOR;
            return (
              <motion.button key={g.name}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.03, y: -4 }}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10">
                <div className="relative">
                  <div className={`inline-flex rounded-lg bg-gradient-to-br ${color} p-2.5 mb-3`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div style={{ fontFamily: "Lora, serif", fontSize: "1rem", fontWeight: 600 }}>{g.name}</div>
                  <div style={{ fontSize: "0.75rem" }} className="text-muted-foreground mt-0.5">
                    {g.novel_count !== null && g.novel_count !== undefined
                      ? `${Number(g.novel_count).toLocaleString("id-ID")} novel`
                      : <span className="opacity-40">Memuat...</span>
                    }
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
