import { Link } from "react-router";
import { ArrowLeft, BookOpen } from "lucide-react";

export function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950/20 to-background px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/10 mb-6" aria-hidden="true">
          <BookOpen size={36} className="text-purple-400" />
        </div>
        <h1
          style={{ fontFamily: "Cinzel, serif", fontSize: "4rem", fontWeight: 700 }}
          className="text-purple-400 mb-2"
        >
          404
        </h1>
        <p className="text-muted-foreground mb-2" style={{ fontSize: "1.1rem" }}>
          Halaman tidak ditemukan
        </p>
        <p className="text-muted-foreground mb-8" style={{ fontSize: "0.9rem" }}>
          Halaman yang Anda cari mungkin telah dipindahkan, dihapus, atau tidak pernah ada.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90 transition"
          style={{ fontSize: "0.9rem" }}
          aria-label="Kembali ke beranda"
        >
          <ArrowLeft size={18} aria-hidden="true" /> Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}