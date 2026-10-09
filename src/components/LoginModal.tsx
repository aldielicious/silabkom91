import React, { useState } from "react";
import { Lock, User, X, ShieldAlert, KeyRound, Eye, EyeOff } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { username: string; name: string; role: string }) => void;
}

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Username dan password tidak boleh kosong.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || "Username atau password salah.");
      } else {
        onSuccess(data.user);
        setUsername("");
        setPassword("");
        onClose();
      }
    } catch (err) {
      setErrorMsg("Koneksi gagal. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn" id="login-modal-overlay">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
        id="login-modal-content"
      >
        {/* Header Background Accent */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-white transition-all cursor-pointer"
            id="close-login-modal"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
              <KeyRound className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">Autentikasi Pengelola</h3>
              <p className="text-xs text-blue-100 mt-0.5">Laboratorium Komputer SMAN 1 Garut</p>
            </div>
          </div>
        </div>

        {/* Form Area */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs flex items-start gap-2 border border-red-100 animate-fadeIn" id="login-error">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full text-xs border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-slate-50/50 transition-colors text-slate-800 font-medium"
                id="login-username-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full text-xs border border-slate-200 rounded-xl pl-10 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-slate-50/50 transition-colors text-slate-800 font-medium"
                id="login-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                id="toggle-show-password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center"
              id="submit-login-btn"
            >
              {isLoading ? "Memverifikasi..." : "Masuk Sistem"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl px-5 py-3 transition-all cursor-pointer"
              id="cancel-login-btn"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
