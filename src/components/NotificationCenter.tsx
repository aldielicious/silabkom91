import React from "react";
import { 
  Bell, 
  Check, 
  CheckSquare, 
  Building2, 
  Laptop, 
  AlertCircle, 
  Info,
  Calendar,
  ShieldCheck
} from "lucide-react";
import { NotificationLog } from "../types";

interface NotificationCenterProps {
  notifications: NotificationLog[];
  onMarkAllAsRead: () => Promise<void>;
  asistenUser?: { username: string; name: string; role: string; adminLevel?: "admin1" | "admin2" } | null;
}

export default function NotificationCenter({
  notifications,
  onMarkAllAsRead,
  asistenUser
}: NotificationCenterProps) {
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl relative">
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">Pusat Notifikasi Khusus Admin</h2>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-blue-600" /> Akses Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Semua log aktivitas dan notifikasi otomatis sistem peminjaman lab & barang secara real-time.
              {asistenUser && <span className="font-semibold text-slate-600 ml-1">Masuk sebagai: {asistenUser.name}</span>}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2.5 rounded-xl border border-blue-100 flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <CheckSquare className="h-4 w-4" /> Tandai Semua Telah Dibaca
          </button>
        )}
      </div>

      {/* Main notifications feed list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-3">
            <Bell className="h-10 w-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm">Belum ada notifikasi sistem saat ini.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              className={`p-4.5 flex items-start gap-4 transition-all ${
                n.isRead ? "bg-white/40 opacity-75" : "bg-blue-50/5 hover:bg-blue-50/10"
              }`}
            >
              {/* Type indicator icon */}
              <div className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${
                n.type === "booking"
                  ? "bg-blue-50 text-blue-600"
                  : n.type === "borrow"
                    ? "bg-cyan-50 text-cyan-600"
                    : "bg-amber-50 text-amber-600"
              }`}>
                {n.type === "booking" && <Building2 className="h-4 w-4" />}
                {n.type === "borrow" && <Laptop className="h-4 w-4" />}
                {n.type === "system" && <Info className="h-4 w-4" />}
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    {n.title}
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"></span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium font-mono flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(n.createdAt).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
                
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {n.message}
                </p>

                {/* Automation highlight label */}
                <span className="inline-block mt-2 text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Sistem Otomatis
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Helper FAQ box for user context */}
      <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/60 text-xs text-slate-500 space-y-2 leading-relaxed">
        <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
          <Info className="h-4 w-4 text-slate-500" /> Bagaimana alur notifikasi otomatis bekerja?
        </h4>
        <p>
          Setiap kali guru, siswa, atau laboran membuat pesanan ruangan lab atau melakukan peminjaman barang, sistem di backend Express memicu generator notifikasi. Notifikasi ini secara otomatis didistribusikan ke dasbor semua pengguna secara real-time tanpa perlu me-refresh halaman, memastikan koordinasi jadwal berjalan mulus.
        </p>
      </div>
    </div>
  );
}
