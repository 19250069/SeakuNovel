import { motion } from "motion/react";
import { Sparkles, BookOpen, Feather } from "lucide-react";
import { Link } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const heroImg = "https://images.unsplash.com/photo-1762554915502-7ce95effe4ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW50YXN5JTIwbWFnaWMlMjBib29rJTIwZGFya3xlbnwxfHx8fDE3NzY1MjQ3MTJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <ImageWithFallback src={heroImg} alt="Magic" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div key={i}
            className="absolute w-1 h-1 rounded-full bg-purple-400"
            style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [-20, 20, -20], opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 mb-6">
              <Sparkles size={14} className="text-purple-400" />
              <span style={{ fontSize: "0.8rem" }} className="text-purple-300">Dunia novel dalam genggamanmu</span>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            style={{ fontFamily: "Cinzel, serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 700, lineHeight: 1.2 }}
            className="mb-6">
            Temukan, Baca &{" "}
            <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Ciptakan
            </span>{" "}
            Dunia Baru
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground mb-10 max-w-xl mx-auto" style={{ fontSize: "1.05rem", lineHeight: 1.7 }}>
            Platform ajaib untuk membaca novel favorit, menulis ceritamu sendiri, dan berbagi review bersama komunitas pecinta sastra.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/browse"
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90 transition shadow-lg shadow-purple-500/25">
              <BookOpen size={18} />
              <span>Mulai Membaca</span>
            </Link>
            <Link to="/write"
              className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-6 py-3 text-foreground hover:bg-secondary/80 transition">
              <Feather size={18} />
              <span>Tulis Novel</span>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 grid grid-cols-3 gap-6 max-w-md mx-auto">
            {[
              { num: "12K+", label: "Novel" },
              { num: "45K+", label: "Pembaca" },
              { num: "3.2K+", label: "Penulis" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div style={{ fontFamily: "Cinzel, serif", fontSize: "1.5rem", fontWeight: 700 }} className="text-purple-400">{s.num}</div>
                <div style={{ fontSize: "0.8rem" }} className="text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
