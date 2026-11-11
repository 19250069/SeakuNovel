import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import { LogIn, UserPlus, X } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function AuthModal({ isOpen, onClose, message }: AuthModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Login diperlukan"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>

            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4">
              <LogIn size={28} className="text-purple-400" />
            </div>

            <h3
              style={{ fontFamily: "Cinzel, serif", fontSize: "1.2rem", fontWeight: 600 }}
              className="mb-2"
            >
              Masuk atau Daftar
            </h3>

            <p className="text-muted-foreground mb-6" style={{ fontSize: "0.9rem" }}>
              {message || "Silakan masuk atau daftar akun untuk mengakses fitur ini."}
            </p>

            <div className="flex flex-col gap-3">
              <Link
                to="/login"
                onClick={onClose}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary/90 transition shadow-sm"
                style={{ fontSize: "0.9rem" }}
              >
                <LogIn size={18} /> Masuk
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 font-medium text-foreground hover:bg-secondary transition"
                style={{ fontSize: "0.9rem" }}
              >
                <UserPlus size={18} /> Daftar Akun
              </Link>
              <button
                onClick={onClose}
                className="flex items-center justify-center gap-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition py-2 hover:bg-secondary/50"
              >
                Kembali
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}