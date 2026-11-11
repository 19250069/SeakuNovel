import { motion } from "motion/react";
import { Feather, FileText, Layers, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const writingImg = "https://images.unsplash.com/photo-1763575647690-5d9a06f3dce9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjB3cml0aW5nJTIwbm90ZWJvb2slMjBjcmVhdGl2ZXxlbnwxfHx8fDE3NzY1MjQ3MTh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

const features = [
  { icon: FileText, title: "Draft Pribadi", desc: "Simpan ide dan draf ceritamu secara privat sebelum dipublikasikan" },
  { icon: Layers, title: "Manajemen Chapter", desc: "Atur bab-bab novelmu dengan mudah, drag & drop untuk mengurutkan" },
  { icon: Sparkles, title: "Editor Canggih", desc: "Editor teks kaya dengan format, catatan, dan pemeriksaan ejaan" },
];

export function WritingSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 mb-5">
              <Feather size={14} className="text-purple-400" />
              <span style={{ fontSize: "0.8rem" }} className="text-purple-300">Untuk Penulis</span>
            </div>
            <h2 style={{ fontFamily: "Cinzel, serif", fontSize: "1.75rem", fontWeight: 600, lineHeight: 1.3 }} className="mb-4">
              Wujudkan Ceritamu Menjadi Nyata
            </h2>
            <p className="text-muted-foreground mb-8" style={{ fontSize: "0.95rem", lineHeight: 1.7 }}>
              Tulis novel impianmu dengan peralatan yang dirancang khusus untuk para penulis. Mulai dari draf hingga karya yang dipublikasikan.
            </p>

            <div className="space-y-5 mb-8">
              {features.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="shrink-0 mt-0.5 rounded-lg bg-purple-500/10 p-2.5">
                    <f.icon size={18} className="text-purple-400" />
                  </div>
                  <div>
                    <h4 style={{ fontFamily: "Lora, serif", fontSize: "0.95rem", fontWeight: 600 }}>{f.title}</h4>
                    <p className="text-muted-foreground" style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link to="/write" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-primary-foreground hover:bg-primary/90 transition shadow-lg shadow-purple-500/20">
              <Feather size={16} /> Mulai Menulis
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="relative">
            <div className="rounded-2xl overflow-hidden border border-border shadow-2xl shadow-purple-500/10">
              <ImageWithFallback src={writingImg} alt="Writing" className="w-full h-80 md:h-96 object-cover" />
            </div>
            {/* Floating card */}
            <motion.div animate={{ y: [-5, 5, -5] }} transition={{ duration: 4, repeat: Infinity }}
              className="absolute -bottom-4 -left-4 rounded-xl bg-card border border-border p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500/20 p-2"><FileText size={16} className="text-green-400" /></div>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>3 Draft Aktif</div>
                  <div style={{ fontSize: "0.7rem" }} className="text-muted-foreground">Terakhir diedit 2 jam lalu</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
