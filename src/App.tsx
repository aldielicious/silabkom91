import React, { useState, useEffect, useCallback } from "react";
import { 
  Building2, 
  Laptop, 
  Bell, 
  FileText, 
  LayoutDashboard, 
  HelpCircle,
  Menu,
  X,
  Lock,
  Sun,
  Moon,
  ShieldCheck
} from "lucide-react";
import { 
  LabRoom, 
  SessionSlot, 
  LabBooking, 
  InventoryItem, 
  InventoryBorrowing, 
  NotificationLog,
  UserRole
} from "./types";
import Dashboard from "./components/Dashboard";
import LabBookingView from "./components/LabBooking";
import InventoryBorrow from "./components/InventoryBorrow";
import NotificationCenter from "./components/NotificationCenter";
import ReportView from "./components/ReportView";
import LoginModal from "./components/LoginModal";

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>("dasbor");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Authentication State for Asisten Lab
  const [asistenUser, setAsistenUser] = useState<{ username: string; name: string; role: string } | null>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("silab_asisten_user") : null;
    return saved ? JSON.parse(saved) : null;
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const handleAsistenLoginSuccess = (user: { username: string; name: string; role: string }) => {
    setAsistenUser(user);
    localStorage.setItem("silab_asisten_user", JSON.stringify(user));
  };

  const handleAsistenLogout = () => {
    setAsistenUser(null);
    localStorage.removeItem("silab_asisten_user");
  };

  // Dark Mode / Light Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("silab_dark_mode");
      return saved ? saved === "true" : false; // Default to Light Mode
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("silab_dark_mode", String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Database States
  const [labs, setLabs] = useState<LabRoom[]>([]);
  const [sessions, setSessions] = useState<SessionSlot[]>([]);
  const [bookings, setBookings] = useState<LabBooking[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [borrowings, setBorrowings] = useState<InventoryBorrowing[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);

  // Page Alert/Error States
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [borrowError, setBorrowError] = useState<string | null>(null);

  // Unified State Refresh Fetcher
  const fetchAllData = useCallback(async () => {
    try {
      const [labsRes, sessionsRes, bookingsRes, invRes, borrowRes, notifRes] = await Promise.all([
        fetch("/api/labs"),
        fetch("/api/sessions"),
        fetch("/api/bookings"),
        fetch("/api/inventory"),
        fetch("/api/borrowings"),
        fetch("/api/notifications")
      ]);

      if (labsRes.ok) setLabs(await labsRes.json());
      if (sessionsRes.ok) setSessions(await sessionsRes.json());
      if (bookingsRes.ok) setBookings(await bookingsRes.json());
      if (invRes.ok) setInventory(await invRes.json());
      if (borrowRes.ok) setBorrowings(await borrowRes.json());
      if (notifRes.ok) setNotifications(await notifRes.json());
    } catch (err) {
      console.error("Gagal melakukan sinkronisasi data real-time dengan server:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAllData();

    // 5-second automatic real-time synchronization polling
    const pollInterval = setInterval(() => {
      fetchAllData();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [fetchAllData]);

  // Handler: Create Lab Booking
  const handleCreateBooking = async (bookingData: {
    labId: string;
    date: string;
    startHour: number;
    endHour: number;
    userName: string;
    userRole: UserRole;
    classroom?: string;
    purpose: string;
  }) => {
    setBookingError(null);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData)
      });
      const data = await response.json();

      if (!response.ok) {
        setBookingError(data.error || "Gagal membuat pemesanan.");
        return false;
      }

      await fetchAllData();
      return true;
    } catch (err) {
      setBookingError("Koneksi gagal. Silakan coba lagi.");
      return false;
    }
  };

  // Handler: Approve/Reject Lab Booking
  const handleUpdateBookingStatus = async (bookingId: string, status: "Disetujui" | "Ditolak") => {
    if (!asistenUser) {
      setBookingError("Anda harus login sebagai Laboran untuk menyetujui atau menolak pengajuan.");
      setIsLoginModalOpen(true);
      return;
    }
    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        await fetchAllData();
      } else {
        const errData = await response.json();
        setBookingError(errData.error || "Gagal memperbarui status booking.");
      }
    } catch (err) {
      console.error("Gagal memperbarui status booking:", err);
      setBookingError("Koneksi gagal. Silakan coba lagi.");
    }
  };

  // Handler: Delete/Cancel Booking
  const handleDeleteBooking = async (bookingId: string) => {
    if (!asistenUser) {
      setBookingError("Anda harus login sebagai Laboran untuk menghapus booking.");
      setIsLoginModalOpen(true);
      return;
    }
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE"
      });
      if (response.ok) {
        await fetchAllData();
      } else {
        const errData = await response.json();
        setBookingError(errData.error || "Gagal menghapus booking.");
      }
    } catch (err) {
      console.error("Gagal membatalkan booking:", err);
      setBookingError("Koneksi gagal. Silakan coba lagi.");
    }
  };

  // Handler: Clear All Bookings in Panel Persetujuan
  const handleClearAllBookings = async () => {
    if (!asistenUser) {
      setBookingError("Anda harus login sebagai Laboran untuk mengosongkan panel persetujuan.");
      setIsLoginModalOpen(true);
      return false;
    }
    try {
      const response = await fetch("/api/bookings-clear-all", {
        method: "DELETE",
        headers: {
          "x-user-role": asistenUser.role
        }
      });
      if (response.ok) {
        await fetchAllData();
        return true;
      } else {
        const errData = await response.json();
        setBookingError(errData.error || "Gagal mengosongkan panel persetujuan.");
        return false;
      }
    } catch (err) {
      console.error("Gagal mengosongkan panel persetujuan:", err);
      setBookingError("Koneksi gagal. Silakan coba lagi.");
      return false;
    }
  };

  // Handler: Borrow Inventory Item
  const handleBorrowItem = async (borrowData: {
    itemId: string;
    quantity: number;
    borrowerName: string;
    borrowerRole: "Guru" | "Siswa";
    classroom?: string;
    returnDate: string;
    purpose: string;
    adminLevel?: "admin1" | "admin2";
  }) => {
    setBorrowError(null);
    try {
      const response = await fetch("/api/borrowings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(borrowData)
      });
      const data = await response.json();

      if (!response.ok) {
        setBorrowError(data.error || "Gagal mencatat peminjaman.");
        return false;
      }

      await fetchAllData();
      return true;
    } catch (err) {
      setBorrowError("Koneksi gagal. Silakan coba lagi.");
      return false;
    }
  };

  // Handler: Return Inventory Item
  const handleReturnItem = async (
    borrowingId: string, 
    returnData: { 
      actualReturnDate: string; 
      actualReturnTime: string; 
      receiverName: string; 
      returnStatus: "Tepat Waktu" | "Terlambat"; 
      evidenceImage?: string | null;
    }
  ) => {
    try {
      const response = await fetch(`/api/borrowings/${borrowingId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(returnData)
      });
      if (response.ok) {
        await fetchAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Gagal memproses pengembalian barang:", err);
      return false;
    }
  };

  // Handler: Approve Borrowing Request (Admin)
  const handleApproveBorrowing = async (borrowingId: string, adminLevel: "admin1" | "admin2", approverName?: string) => {
    try {
      const response = await fetch(`/api/borrowings/${borrowingId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminLevel, approverName })
      });
      const data = await response.json();
      if (response.ok) {
        await fetchAllData();
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || "Gagal menyetujui peminjaman." };
    } catch (err) {
      console.error("Gagal menyetujui peminjaman:", err);
      return { success: false, error: "Koneksi gagal. Silakan coba lagi." };
    }
  };

  // Handler: Update Lab Details (PC count, status, equipment)
  const handleUpdateLab = async (
    labId: string, 
    labData: { pcCount?: number; capacity?: number; status?: "Tersedia" | "Digunakan" | "Pemeliharaan"; equipment?: string[] }
  ) => {
    try {
      const response = await fetch(`/api/labs/${labId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(labData)
      });
      const data = await response.json();
      if (response.ok) {
        await fetchAllData();
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || "Gagal memperbarui data lab." };
    } catch (err) {
      console.error("Gagal memperbarui data lab:", err);
      return { success: false, error: "Koneksi gagal. Silakan coba lagi." };
    }
  };

  // Handler: Reject Borrowing Request (Admin)
  const handleRejectBorrowing = async (borrowingId: string, adminLevel: "admin1" | "admin2", rejectorName?: string, reason?: string) => {
    try {
      const response = await fetch(`/api/borrowings/${borrowingId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminLevel, rejectorName, reason })
      });
      const data = await response.json();
      if (response.ok) {
        await fetchAllData();
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || "Gagal menolak peminjaman." };
    } catch (err) {
      console.error("Gagal menolak peminjaman:", err);
      return { success: false, error: "Koneksi gagal. Silakan coba lagi." };
    }
  };

  // Handler: Delete Borrowing History Record (Admin 1 only)
  const handleDeleteBorrowing = async (borrowingId: string) => {
    try {
      const response = await fetch(`/api/borrowings/${borrowingId}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-level": (asistenUser as any)?.adminLevel || "admin1"
        }
      });
      const data = await response.json();
      if (response.ok) {
        await fetchAllData();
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || "Gagal menghapus riwayat peminjaman." };
    } catch (err) {
      console.error("Gagal menghapus riwayat peminjaman:", err);
      return { success: false, error: "Koneksi gagal. Silakan coba lagi." };
    }
  };

  // Handler: Add Inventory Item (Admin)
  const handleAddInventoryItem = async (itemData: {
    code?: string;
    name: string;
    category: string;
    location: string;
    totalQty: number;
    image?: string | null;
    approvalAdmin?: "admin1_only" | "both";
  }) => {
    if (!asistenUser || asistenUser.role !== "Laboran") {
      setBorrowError("Akses ditolak: Hanya admin yang dapat menambahkan data barang inventaris.");
      return false;
    }
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-role": asistenUser.role,
          "x-admin-level": (asistenUser as any)?.adminLevel || "admin1"
        },
        body: JSON.stringify({
          ...itemData,
          requesterRole: asistenUser.role
        })
      });
      if (response.ok) {
        await fetchAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Gagal menambahkan barang inventaris:", err);
      return false;
    }
  };

  // Handler: Update Inventory Item (Admin)
  const handleUpdateInventoryItem = async (itemId: string, itemData: {
    code?: string;
    name?: string;
    category?: string;
    location?: string;
    totalQty?: number;
    availableQty?: number;
    image?: string | null;
    approvalAdmin?: "admin1_only" | "both";
  }) => {
    if (!asistenUser || asistenUser.role !== "Laboran") {
      setBorrowError("Akses ditolak: Hanya admin yang dapat mengubah data barang inventaris.");
      return false;
    }
    try {
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-role": asistenUser.role,
          "x-admin-level": (asistenUser as any)?.adminLevel || "admin1"
        },
        body: JSON.stringify({
          ...itemData,
          requesterRole: asistenUser.role
        })
      });
      if (response.ok) {
        await fetchAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Gagal memperbarui barang inventaris:", err);
      return false;
    }
  };

  // Handler: Delete Inventory Item (Admin)
  const handleDeleteInventoryItem = async (itemId: string) => {
    if (!asistenUser || asistenUser.role !== "Laboran") {
      setBorrowError("Akses ditolak: Hanya admin yang dapat menghapus data barang inventaris.");
      return false;
    }
    try {
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: "DELETE",
        headers: { 
          "x-user-role": asistenUser.role,
          "x-admin-level": (asistenUser as any)?.adminLevel || "admin1"
        }
      });
      if (response.ok) {
        await fetchAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Gagal menghapus barang inventaris:", err);
      return false;
    }
  };

  // Handler: Mark all notifications as read
  const handleMarkAllNotificationsAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST"
      });
      if (response.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error("Gagal menandai seluruh notifikasi dibaca:", err);
    }
  };

  // Handler: Fetch Gemini Report Summary Analysis
  const handleFetchAiSummary = async () => {
    const response = await fetch("/api/gemini/summarize");
    if (!response.ok) {
      throw new Error("Gagal mengambil rangkuman AI.");
    }
    return response.json();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark bg-[#080d1a]" : "bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/20"} flex flex-col md:flex-row font-sans text-slate-800 dark:text-slate-100 transition-all duration-700`}>
      
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0 sticky top-0 h-screen print:hidden" id="sidebar-navigation">
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <Laptop className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xs font-black text-slate-900 tracking-wider">SILAB-KOM</h1>
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">SMAN 1 Garut</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="space-y-1 flex-1 text-xs font-semibold text-slate-500">
            {[
              { id: "dasbor", label: "Dashboard", icon: LayoutDashboard },
              { id: "penggunaan-lab", label: "Penggunaan Ruang", icon: Building2 },
              { id: "peminjaman-barang", label: "Inventaris Barang", icon: Laptop },
              { id: "notifikasi", label: "Pusat Notifikasi", icon: Bell, badge: asistenUser ? unreadCount : undefined, restricted: true },
              { id: "laporan", label: "Laporan Real-time", icon: FileText, restricted: true }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-bold border border-blue-100/50"
                      : "hover:text-slate-900 hover:bg-slate-50 font-medium"
                  }`}
                  id={`sidebar-nav-tab-${tab.id}`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4.5 w-4.5" />
                    {tab.label}
                    {tab.restricted && !asistenUser && (
                      <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200/50 flex items-center gap-1 font-bold ml-1.5">
                        <Lock className="h-2.5 w-2.5" /> Terbatas
                      </span>
                    )}
                  </span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse ml-0.5">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Bottom Profile - Admin Lab Card */}
          <div className="mt-auto pt-6 border-t border-slate-100">
            {asistenUser ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-500 shadow-xs overflow-hidden flex items-center justify-center font-bold text-blue-700 uppercase shrink-0">
                    {asistenUser.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{asistenUser.name}</p>
                    <p className="text-[10px] font-semibold text-blue-600">Laboran</p>
                  </div>
                </div>
                <button
                  onClick={handleAsistenLogout}
                  className="w-full text-center text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 font-bold py-1.5 rounded-lg border border-red-100/50 transition-all cursor-pointer"
                  id="asisten-logout-sidebar-btn"
                >
                  Keluar Laboran
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-xs overflow-hidden flex items-center justify-center font-bold text-slate-500 shrink-0">
                    AD
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Admin Lab</p>
                    <p className="text-[10px] text-slate-500">Guru Pengampu</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="w-full text-center text-[10px] text-blue-600 hover:text-blue-800 hover:bg-blue-50/50 font-bold py-1.5 rounded-lg border border-blue-100/30 transition-all cursor-pointer"
                  id="asisten-login-sidebar-btn"
                >
                  Masuk Laboran
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Topbar (only on small screens) */}
      <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-3 flex items-center justify-between print:hidden" id="mobile-header">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
            <Laptop className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xs font-black text-slate-800 tracking-wider leading-none">SILAB-KOM</h1>
            <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">SMAN 1 Garut</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Mobile Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg transition-all"
            title={isDarkMode ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            id="mode-toggle-mobile-btn"
          >
            {isDarkMode ? <Sun className="h-5 w-5 text-amber-500 animate-spin-slow" /> : <Moon className="h-5 w-5 text-blue-600" />}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg transition-all"
            id="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white p-4 space-y-1 animate-slideDown shadow-lg absolute top-12 left-0 right-0 z-50 print:hidden">
          {[
            { id: "dasbor", label: "Dashboard", icon: LayoutDashboard },
            { id: "penggunaan-lab", label: "Penggunaan Ruang", icon: Building2 },
            { id: "peminjaman-barang", label: "Inventaris Barang", icon: Laptop },
            { id: "notifikasi", label: "Pusat Notifikasi", icon: Bell, badge: asistenUser ? unreadCount : undefined, restricted: true },
            { id: "laporan", label: "Laporan Real-time", icon: FileText, restricted: true }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
                id={`mobile-nav-tab-${tab.id}`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4.5 w-4.5" />
                  {tab.label}
                  {tab.restricted && !asistenUser && (
                    <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200/50 flex items-center gap-1 font-bold ml-1.5">
                      <Lock className="h-2.5 w-2.5" /> Terbatas
                    </span>
                  )}
                </span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Desktop Header / Topbar */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 px-8 items-center justify-between shadow-xs z-10 print:hidden" id="desktop-topbar">
          <h2 className="text-sm font-semibold text-slate-700 underline underline-offset-8 decoration-blue-500 decoration-2">
            {activeTab === "dasbor" && "Ringkasan Laboratorium"}
            {activeTab === "penggunaan-lab" && "Sistem Penggunaan Ruang"}
            {activeTab === "peminjaman-barang" && "Sistem Inventaris & Barang"}
            {activeTab === "notifikasi" && "Pusat Notifikasi Sistem"}
            {activeTab === "laporan" && "Laporan Cerdas Gemini AI"}
          </h2>
          <div className="flex items-center gap-6">
            {/* Dark/Light Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase transition-all shrink-0 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-3xs"
              title={isDarkMode ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
              id="mode-toggle-desktop-btn"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Mode Terang</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Mode Gelap</span>
                </>
              )}
            </button>

            <button
              onClick={() => setActiveTab("notifikasi")}
              className="relative text-slate-400 hover:text-slate-600 transition-colors p-1"
              title="Pusat Notifikasi"
            >
              {asistenUser && unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
              <Bell className="w-5 h-5" />
            </button>
            <div className="text-xs text-slate-500 font-medium">
              {new Date().toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })} | <span className="font-mono bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-[11px] text-slate-600">Sync Aktif</span>
            </div>
          </div>
        </header>

        {/* Workspace content container */}
        <main className="flex-1 p-6 md:p-8 print:p-0 print:m-0">
          {activeTab === "dasbor" && (
            <Dashboard 
              labs={labs}
              bookings={bookings}
              borrowings={borrowings}
              notifications={notifications}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "penggunaan-lab" && (
            <LabBookingView
              labs={labs}
              sessions={sessions}
              bookings={bookings}
              onCreateBooking={handleCreateBooking}
              onUpdateStatus={handleUpdateBookingStatus}
              onDeleteBooking={handleDeleteBooking}
              onClearAllBookings={handleClearAllBookings}
              onUpdateLab={handleUpdateLab}
              errorMsg={bookingError}
              setErrorMsg={setBookingError}
              asistenUser={asistenUser}
              onTriggerLogin={() => setIsLoginModalOpen(true)}
              onLogout={handleAsistenLogout}
            />
          )}

          {activeTab === "peminjaman-barang" && (
            <InventoryBorrow
              inventory={inventory}
              borrowings={borrowings}
              onBorrowItem={handleBorrowItem}
              onReturnItem={handleReturnItem}
              onApproveBorrowing={handleApproveBorrowing}
              onRejectBorrowing={handleRejectBorrowing}
              onDeleteBorrowing={handleDeleteBorrowing}
              onAddInventoryItem={handleAddInventoryItem}
              onUpdateInventoryItem={handleUpdateInventoryItem}
              onDeleteInventoryItem={handleDeleteInventoryItem}
              errorMsg={borrowError}
              setErrorMsg={setBorrowError}
              asistenUser={asistenUser}
              onTriggerLogin={() => setIsLoginModalOpen(true)}
              onLogout={handleAsistenLogout}
            />
          )}

          {activeTab === "notifikasi" && (
            asistenUser ? (
              <NotificationCenter
                notifications={notifications}
                onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                asistenUser={asistenUser}
              />
            ) : (
              <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-xl shadow-slate-100/50 animate-fadeIn" id="notif-restricted-gate">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-200">
                  <Lock className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Pusat Notifikasi Khusus Admin</h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Pusat Notifikasi berisi rekam jejak aktivitas laboratorium, transaksi peminjaman barang, serta log sistem real-time yang hanya dapat diakses oleh Admin / Laboran Komputer. Silakan masuk terlebih dahulu untuk mengakses menu ini.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    id="btn-login-notif-gate"
                  >
                    <ShieldCheck className="h-4 w-4" /> Masuk Sebagai Admin
                  </button>
                  <button
                    onClick={() => setActiveTab("dasbor")}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Kembali ke Dasbor
                  </button>
                </div>
              </div>
            )
          )}

          {activeTab === "laporan" && (
            asistenUser ? (
              <ReportView
                bookings={bookings}
                borrowings={borrowings}
                onFetchAiSummary={handleFetchAiSummary}
                asistenUser={asistenUser}
                onTriggerLogin={() => setIsLoginModalOpen(true)}
              />
            ) : (
              <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-xl shadow-slate-100/50 animate-fadeIn">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-200">
                  <Lock className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Akses Terbuka Hanya untuk Laboran</h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Halaman Laporan Real-time & Analisis Cerdas berisi data operasional sensitif, riwayat lengkap penggunaan lab, serta log peminjaman barang. Silakan login sebagai Laboran untuk melihat atau mengunduh laporan ini.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    Masuk Sekarang
                  </button>
                  <button
                    onClick={() => setActiveTab("dasbor")}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Kembali ke Dasbor
                  </button>
                </div>
              </div>
            )
          )}
        </main>

        {/* Humble Footer */}
        <footer className="bg-white border-t border-slate-100 py-4 px-8 text-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider print:hidden mt-auto">
          © {new Date().getFullYear()} SILAB-KOM. Sistem Informasi Laboratorium Komputer Mandiri. Terkoneksi Real-Time & Cerdas.
        </footer>
      </div>

      {/* Printable CSS style overlay for full-page standard reports */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          #sidebar-navigation, #mobile-header, #desktop-topbar {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
        }
      `}</style>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleAsistenLoginSuccess}
      />

    </div>
  );
}
