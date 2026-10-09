import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { motion } from "motion/react";
import { 
  Building2, 
  Laptop, 
  ClipboardCheck, 
  AlertTriangle, 
  Bell, 
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";
import { LabBooking, InventoryBorrowing, NotificationLog, LabRoom } from "../types";

interface DashboardProps {
  labs: LabRoom[];
  bookings: LabBooking[];
  borrowings: InventoryBorrowing[];
  notifications: NotificationLog[];
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ 
  labs, 
  bookings, 
  borrowings, 
  notifications,
  onNavigate 
}: DashboardProps) {
  
  // Calculate statistics
  const activeBookingsCount = bookings.filter(b => b.status === "Disetujui").length;
  const pendingBookingsCount = bookings.filter(b => b.status === "Menunggu").length;
  const activeBorrowingsCount = borrowings.filter(b => b.status === "Dipinjam").length;
  
  const todayStr = new Date().toISOString().split("T")[0];
  const overdueBorrowingsCount = borrowings.filter(b => {
    return b.status === "Dipinjam" && b.returnDate < todayStr;
  }).length;

  // 1. Prepare Chart Data for Lab Bookings Distribution
  const bookingStats = labs.map(lab => {
    const approvedCount = bookings.filter(b => b.labId === lab.id && b.status === "Disetujui").length;
    const pendingCount = bookings.filter(b => b.labId === lab.id && b.status === "Menunggu").length;
    return {
      name: lab.name.replace("Komputer", "").trim(),
      Disetujui: approvedCount,
      Menunggu: pendingCount,
    };
  });

  // 2. Prepare Chart Data for Inventory Borrowings status distribution
  const returnedCount = borrowings.filter(b => b.status === "Dikembalikan").length;
  const borrowedCount = borrowings.filter(b => b.status === "Dipinjam").length;
  const overdueCount = borrowings.filter(b => b.status === "Dipinjam" && b.returnDate < todayStr).length;

  const itemStats = [
    { name: "Selesai (Dikembalikan)", value: returnedCount - overdueCount > 0 ? returnedCount : returnedCount, color: "#10B981" },
    { name: "Sedang Dipinjam", value: borrowedCount - overdueCount, color: "#3B82F6" },
    { name: "Terlambat (Overdue)", value: overdueCount, color: "#EF4444" },
  ].filter(item => item.value > 0);

  // Fallback if no item data
  const finalItemStats = itemStats.length > 0 ? itemStats : [
    { name: "Selesai (Dikembalikan)", value: 1, color: "#10B981" },
    { name: "Sedang Dipinjam", value: 1, color: "#3B82F6" }
  ];

  // Micro-interactions constants
  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: custom * 0.08, duration: 0.35, ease: "easeOut" as any }
    })
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-5 md:gap-6 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

        {/* Text Details */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 font-sans leading-tight">
            Sistem Informasi Laboratorium Komputer SMAN 1 Garut
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-sans mt-1.5 leading-relaxed font-medium">
            Sistem monitoring real-time penjadwalan ruang praktikum, sirkulasi peminjaman alat inventaris lab, dan asisten cerdas AI sekolah.
          </p>
        </div>

        {/* Online Status Badge */}
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-xs font-bold border border-emerald-100/50 self-center">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Sistem Online & Terhubung
        </div>
      </div>

      {/* Gerbang Akses Cepat (Dua Tombol Utama) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="main-navigation-portal">
        {/* Tombol Akses Penggunaan Lab */}
        <motion.button
          onClick={() => onNavigate("penggunaan-lab")}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-2xl border border-blue-700 shadow-md hover:shadow-lg transition-all text-left flex items-center justify-between cursor-pointer"
          id="btn-goto-lab"
        >
          {/* Decorative glass glow */}
          <div className="absolute right-0 bottom-0 w-48 h-48 bg-white/5 rounded-full translate-x-12 translate-y-12 group-hover:scale-125 transition-transform duration-500"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3.5 bg-white/10 group-hover:bg-white/20 rounded-xl transition-colors">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Masuk Menu Penggunaan Lab</h3>
              <p className="text-xs text-blue-100 mt-1 font-medium">Jadwal praktikum komputer, periksa sesi kosong, & ajukan kelas</p>
            </div>
          </div>
          <div className="p-2 bg-white/10 group-hover:bg-white/20 rounded-full transition-all relative z-10 group-hover:translate-x-1">
            <ArrowRight className="h-5 w-5 text-white" />
          </div>
        </motion.button>

        {/* Tombol Akses Peminjaman Alat */}
        <motion.button
          onClick={() => onNavigate("peminjaman-barang")}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="group relative overflow-hidden bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-2xl border border-slate-950 shadow-md hover:shadow-lg transition-all text-left flex items-center justify-between cursor-pointer"
          id="btn-goto-borrow"
        >
          {/* Decorative glass glow */}
          <div className="absolute right-0 bottom-0 w-48 h-48 bg-white/5 rounded-full translate-x-12 translate-y-12 group-hover:scale-125 transition-transform duration-500"></div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3.5 bg-white/10 group-hover:bg-white/20 rounded-xl transition-colors">
              <Laptop className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Masuk Menu Peminjaman Alat</h3>
              <p className="text-xs text-slate-300 mt-1 font-medium">Pinjam laptop, proyektor, aksesoris, & konfirmasi pengembalian</p>
            </div>
          </div>
          <div className="p-2 bg-white/10 group-hover:bg-white/20 rounded-full transition-all relative z-10 group-hover:translate-x-1">
            <ArrowRight className="h-5 w-5 text-white" />
          </div>
        </motion.button>
      </div>
    </div>
  );
}
