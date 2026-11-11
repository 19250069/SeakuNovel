import { useState } from "react";
import { X, Flag, CheckCircle2, AlertCircle } from "lucide-react";
import { reportService } from "../../services/reportService";
import { useAuth } from "../../contexts/AuthContext";
import { AuthModal } from "./AuthModal";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "novel" | "chapter" | "comment" | "review" | "user";
  targetId: string;
  targetTitle?: string;
}

const REPORT_REASONS = [
  "Spam, promosi tidak relevan, atau bot",
  "Pelanggaran hak cipta atau plagiarisme",
  "Konten seksual eksplisit atau kekerasan ekstrem",
  "Ujaran kebencian, pelecehan, atau ancaman",
  "Teks rusak, terpotong, atau tidak terbaca",
  "Alasan lainnya",
];

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
}: ReportModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (!isOpen) return null;

  if (!user) {
    return (
      <AuthModal
        isOpen={isOpen}
        onClose={onClose}
        message="Silakan masuk atau buat akun terlebih dahulu untuk melaporkan konten."
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    setSubmitting(true);
    setError(null);
    try {
      await reportService.create({
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details.trim(),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Report error:", err);
      setError(
        err.response?.data?.error || "Gagal mengirim laporan. Silakan coba beberapa saat lagi."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getTargetTypeLabel = () => {
    switch (targetType) {
      case "novel":
        return "Novel";
      case "chapter":
        return "Bab";
      case "review":
        return "Ulasan";
      case "comment":
        return "Komentar";
      case "user":
        return "Pengguna";
      default:
        return "Konten";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
          aria-label="Tutup dialog"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 size={48} className="mx-auto text-emerald-400" />
            <h3 className="text-lg font-semibold text-foreground">Laporan Terkirim</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Terima kasih telah membantu menjaga komunitas SeakuNovel tetap aman dan nyaman. Tim
              moderator kami akan segera meninjau laporan Anda.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-500/10 p-2.5 text-red-400">
                <Flag size={20} />
              </div>
              <div>
                <h2 id="report-modal-title" className="text-base font-semibold text-foreground">
                  Laporkan {getTargetTypeLabel()}
                </h2>
                {targetTitle && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    &ldquo;{targetTitle}&rdquo;
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Pilih Alasan Pelaporan
              </label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs transition cursor-pointer ${
                      reason === r
                        ? "border-primary bg-primary/5 text-foreground font-medium"
                        : "border-border/60 text-muted-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-primary"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="report-details" className="text-xs font-semibold text-foreground">
                Keterangan Tambahan (Opsional)
              </label>
              <textarea
                id="report-details"
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Berikan konteks atau rincian tambahan untuk membantu tim peninjau..."
                className="w-full rounded-lg bg-secondary border border-border p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-500 transition disabled:opacity-50"
              >
                {submitting ? "Mengirim..." : "Kirim Laporan"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ReportModal;
