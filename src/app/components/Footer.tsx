import { useState, useEffect } from "react";
import { SeakuLogo } from "./SeakuLogo";
import { Heart, X } from "lucide-react";

export function Footer() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveModal(null);
    };
    if (activeModal) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [activeModal]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setActiveModal(null);
    }
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case "Tentang":
        return (
          <>
            <h2 className="text-2xl font-bold mb-4 text-purple-300">Tentang SeakuNovel</h2>
            <p className="text-foreground/80 leading-relaxed">
              SeakuNovel adalah platform literatur digital generasi baru yang didedikasikan untuk penulis dan pembaca web novel. 
              Misi kami adalah menyediakan ekosistem membaca yang nyaman, bersih, dan interaktif, sekaligus memberdayakan para penulis untuk 
              mempublikasikan karya terbaik mereka kepada audiens secara instan.
            </p>
          </>
        );
      case "Bantuan":
        return (
          <>
            <h2 className="text-2xl font-bold mb-4 text-purple-300">Bantuan & FAQ</h2>
            <div className="space-y-4 text-foreground/80">
              <div>
                <h3 className="font-semibold text-purple-200">Bagaimana cara membaca novel?</h3>
                <p className="text-sm">Anda dapat menelusuri novel dari halaman utama atau pencarian. Klik judul novel untuk melihat sinopsis, lalu pilih bab yang tersedia.</p>
              </div>
              <div>
                <h3 className="font-semibold text-purple-200">Bagaimana cara mempublikasikan karya?</h3>
                <p className="text-sm">Jika Anda memiliki akses kreator (Author), buka menu "Write" di panel navigasi atas, buat novel baru, dan tambahkan bab demi bab.</p>
              </div>
            </div>
          </>
        );
      case "Kebijakan":
        return (
          <>
            <h2 className="text-2xl font-bold mb-4 text-purple-300">Kebijakan Privasi & Syarat Layanan</h2>
            <div className="space-y-4 text-foreground/80 text-sm">
              <p>
                <strong>Syarat Layanan:</strong> Dengan menggunakan SeakuNovel, Anda setuju untuk tidak mempublikasikan konten yang melanggar hukum, plagiat, atau mengandung unsur kebencian ekstrem.
              </p>
              <p>
                <strong>Kebijakan Privasi:</strong> Kami menjaga keamanan data pribadi Anda dengan sistem enkripsi dan tidak membagikannya kepada pihak ketiga tanpa izin eksplisit Anda.
              </p>
              <p className="italic mt-4 opacity-75">
                (Pembaruan terakhir: September 2026)
              </p>
            </div>
          </>
        );
      case "Kontak":
        return (
          <>
            <h2 className="text-2xl font-bold mb-4 text-purple-300">Hubungi Kami</h2>
            <div className="space-y-4 text-foreground/80">
              <p>
                Punya pertanyaan, kritik, atau saran untuk SeakuNovel? Jangan ragu untuk menghubungi kami melalui jalur resmi kami.
              </p>
              <div className="mt-6">
                <a 
                  href="https://x.com/SeakuNoveL" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className="w-5 h-5">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                  </svg>
                  X (Twitter) @SeakuNoveL
                </a>
              </div>

            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <footer className="border-t border-border bg-card/50 py-10" role="contentinfo">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <SeakuLogo size={28} />
              <span style={{ fontFamily: "Cinzel, serif", fontSize: "1rem", fontWeight: 600 }}
                className="bg-gradient-to-r from-purple-400 to-violet-300 bg-clip-text text-transparent">
                SeakuNovel
              </span>
            </div>
            
            <nav aria-label="Footer navigasi" className="flex flex-wrap justify-center items-center gap-6 text-muted-foreground" style={{ fontSize: "0.85rem" }}>
              <button 
                onClick={() => setActiveModal("Tentang")}
                className="hover:text-purple-300 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all duration-300 cursor-pointer"
              >
                Tentang
              </button>
              <button 
                onClick={() => setActiveModal("Bantuan")}
                className="hover:text-purple-300 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all duration-300 cursor-pointer"
              >
                Bantuan
              </button>
              <button 
                onClick={() => setActiveModal("Kebijakan")}
                className="hover:text-purple-300 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all duration-300 cursor-pointer"
              >
                Kebijakan
              </button>
              <button 
                onClick={() => setActiveModal("Kontak")}
                className="hover:text-purple-300 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all duration-300 cursor-pointer"
              >
                Kontak
              </button>
            </nav>

            <div className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: "0.8rem" }}>
              <span>Made for all users</span>
              <Heart size={12} className="text-purple-400 animate-pulse" fill="currentColor" aria-hidden="true" />
              <span>SeakuNovel 2026</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal / Dialog Overlay */}
      {activeModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={handleBackdropClick}
        >
          <div 
            className="relative w-full max-w-lg bg-card/95 border border-purple-500/30 rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(147,51,234,0.15)] animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-full transition-colors"
              aria-label="Tutup modal"
            >
              <X size={20} />
            </button>
            {renderModalContent()}
          </div>
        </div>
      )}
    </>
  );
}