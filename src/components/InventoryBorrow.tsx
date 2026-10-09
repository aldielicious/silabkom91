import React, { useState } from "react";
import { 
  Laptop, 
  PlusCircle, 
  ArrowLeftRight, 
  Calendar, 
  User, 
  Check, 
  AlertCircle, 
  MapPin, 
  Clock,
  History,
  CornerDownLeft,
  Edit,
  Trash2,
  Settings,
  Plus,
  Save,
  X,
  Camera,
  Image,
  Upload,
  Search,
  ChevronDown,
  ShieldAlert,
  Users,
  Lock,
  ShieldCheck,
  Package,
  KeyRound
} from "lucide-react";
import { InventoryItem, InventoryBorrowing, UserRole } from "../types";
import { TEACHERS } from "../teachers";
import { CLASSROOMS, formatClassroomName } from "../classrooms";

interface InventoryBorrowProps {
  inventory: InventoryItem[];
  borrowings: InventoryBorrowing[];
  onBorrowItem: (borrowData: {
    itemId: string;
    quantity: number;
    borrowerName: string;
    borrowerRole: UserRole;
    classroom?: string;
    returnDate: string;
    purpose: string;
    adminLevel?: "admin1" | "admin2";
  }) => Promise<boolean>;
  onReturnItem: (
    borrowingId: string,
    returnData: {
      actualReturnDate: string;
      actualReturnTime: string;
      receiverName: string;
      returnStatus: "Tepat Waktu" | "Terlambat";
      evidenceImage?: string | null;
    }
  ) => Promise<boolean>;
  onApproveBorrowing?: (
    borrowingId: string, 
    adminLevel: "admin1" | "admin2", 
    approverName?: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  onRejectBorrowing?: (
    borrowingId: string, 
    adminLevel: "admin1" | "admin2", 
    rejectorName?: string, 
    reason?: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDeleteBorrowing?: (
    borrowingId: string
  ) => Promise<{ success: boolean; message?: string; error?: string } | boolean>;
  onAddInventoryItem: (itemData: {
    code?: string;
    name: string;
    category: string;
    location: string;
    totalQty: number;
    image?: string | null;
    approvalAdmin?: "admin1_only" | "both";
  }) => Promise<boolean>;
  onUpdateInventoryItem: (itemId: string, itemData: {
    code?: string;
    name?: string;
    category?: string;
    location?: string;
    totalQty?: number;
    availableQty?: number;
    image?: string | null;
    approvalAdmin?: "admin1_only" | "both";
  }) => Promise<boolean>;
  onDeleteInventoryItem: (itemId: string) => Promise<boolean>;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  asistenUser?: { username: string; name: string; role: string; adminLevel?: "admin1" | "admin2" } | null;
  onTriggerLogin?: () => void;
  onLogout?: () => void;
}

export default function InventoryBorrow({
  inventory,
  borrowings,
  onBorrowItem,
  onReturnItem,
  onApproveBorrowing,
  onRejectBorrowing,
  onDeleteBorrowing,
  onAddInventoryItem,
  onUpdateInventoryItem,
  onDeleteInventoryItem,
  errorMsg,
  setErrorMsg,
  asistenUser,
  onTriggerLogin,
  onLogout
}: InventoryBorrowProps) {
  const [activeRole, setActiveRole] = useState<UserRole>("Siswa");

  // Sync active role with logged in status
  React.useEffect(() => {
    if (asistenUser) {
      setActiveRole("Laboran");
    } else if (activeRole === "Laboran") {
      setActiveRole("Siswa");
    }
  }, [asistenUser]);
  const [selectedItemId, setSelectedItemId] = useState<string>(inventory[0]?.id || "");
  
  // Form Fields
  const [formQty, setFormQty] = useState<number>(1);
  const [formBorrowerName, setFormBorrowerName] = useState<string>("");
  const [showTeacherSuggestions, setShowTeacherSuggestions] = useState<boolean>(false);
  const [formClassroom, setFormClassroom] = useState<string>("X-1");
  const [formReturnDate, setFormReturnDate] = useState<string>(
    new Date(Date.now() + 3600000 * 24 * 3).toISOString().split("T")[0] // default 3 days later
  );
  const [formPurpose, setFormPurpose] = useState<string>("");
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Return Form States
  const [returningBorrowing, setReturningBorrowing] = useState<InventoryBorrowing | null>(null);
  const [returnActualDate, setReturnActualDate] = useState<string>("");
  const [returnActualTime, setReturnActualTime] = useState<string>("");
  const [returnReceiver, setReturnReceiver] = useState<string>("");
  const [returnStatus, setReturnStatus] = useState<"Tepat Waktu" | "Terlambat">("Tepat Waktu");
  const [returnEvidenceImage, setReturnEvidenceImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [searchBorrowerName, setSearchBorrowerName] = useState<string>("");
  const [searchItem, setSearchItem] = useState<string>("");

  const handleStartReturn = (borrowing: InventoryBorrowing) => {
    setReturningBorrowing(borrowing);
    const todayStr = new Date().toISOString().split("T")[0];
    setReturnActualDate(todayStr);
    
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0].substring(0, 5); // HH:MM
    setReturnActualTime(timeStr);
    
    // Diisi oleh peminjam, sehingga kosongkan atau berikan input kosong/bersih agar diisi manual
    setReturnReceiver("");
    setReturnEvidenceImage(null);
    
    const isLate = todayStr > borrowing.returnDate;
    setReturnStatus(isLate ? "Terlambat" : "Tepat Waktu");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleReturnDateChange = (dateVal: string) => {
    setReturnActualDate(dateVal);
    if (returningBorrowing) {
      const isLate = dateVal > returningBorrowing.returnDate;
      setReturnStatus(isLate ? "Terlambat" : "Tepat Waktu");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setReturnEvidenceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAddImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningBorrowing) return;

    if (!returnReceiver.trim()) {
      setErrorMsg("Nama penerima barang wajib diisi.");
      return;
    }

    if (!returnEvidenceImage) {
      setErrorMsg("Bukti pengembalian (foto) wajib diunggah.");
      return;
    }

    setIsSubmitting(true);
    const success = await onReturnItem(returningBorrowing.id, {
      actualReturnDate: returnActualDate,
      actualReturnTime: returnActualTime,
      receiverName: returnReceiver,
      returnStatus,
      evidenceImage: returnEvidenceImage
    });
    setIsSubmitting(false);

    if (success) {
      setSuccessMsg(`Barang ${returningBorrowing.itemName} berhasil dikembalikan!`);
      setReturningBorrowing(null);
      setReturnEvidenceImage(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    } else {
      setErrorMsg("Gagal memproses pengembalian barang.");
    }
  };

  // Admin Level state (Admin 1 vs Admin 2)
  const [activeAdminLevel, setActiveAdminLevel] = useState<"admin1" | "admin2">(
    asistenUser?.adminLevel || "admin1"
  );

  // Admin Mode state
  const [adminManageMode, setAdminManageMode] = useState<boolean>(false);

  React.useEffect(() => {
    if (asistenUser?.adminLevel) {
      setActiveAdminLevel(asistenUser.adminLevel);
    }
  }, [asistenUser]);

  React.useEffect(() => {
    if (activeRole === "Laboran") {
      if (activeAdminLevel === "admin1") {
        setAdminManageMode(true);
      } else {
        setAdminManageMode(false);
        setEditingItemId(null);
        setConfirmDeleteId(null);
      }
    } else {
      setAdminManageMode(false);
      setEditingItemId(null);
      setConfirmDeleteId(null);
    }
  }, [activeRole, activeAdminLevel]);
  
  // Add item fields
  const [addCode, setAddCode] = useState<string>("");
  const [addName, setAddName] = useState<string>("");
  const [addCategory, setAddCategory] = useState<string>("Laptop");
  const [addLocation, setAddLocation] = useState<string>("Lab Komputer A");
  const [addTotalQty, setAddTotalQty] = useState<number>(10);
  const [addImage, setAddImage] = useState<string | null>(null);
  const [addApprovalAdmin, setAddApprovalAdmin] = useState<"admin1_only" | "both">("both");
  const [isAddingItem, setIsAddingItem] = useState<boolean>(false);

  // Edit item fields
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [editLocation, setEditLocation] = useState<string>("");
  const [editTotalQty, setEditTotalQty] = useState<number>(0);
  const [editAvailableQty, setEditAvailableQty] = useState<number>(0);
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editApprovalAdmin, setEditApprovalAdmin] = useState<"admin1_only" | "both">("both");

  // Confirm delete state (Inventory Item)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Confirm delete borrowing record state (Borrowing History - Admin 1)
  const [borrowingToDelete, setBorrowingToDelete] = useState<InventoryBorrowing | null>(null);
  const [isDeletingBorrowing, setIsDeletingBorrowing] = useState<boolean>(false);

  // Action status
  const [adminSuccessMsg, setAdminSuccessMsg] = useState<string | null>(null);
  const [adminErrorMsg, setAdminErrorMsg] = useState<string | null>(null);

  const handleConfirmDeleteBorrowing = async () => {
    if (!borrowingToDelete || !onDeleteBorrowing) return;
    if (activeAdminLevel !== "admin1") {
      setAdminErrorMsg("Akses Ditolak: Hanya Admin 1 yang dapat menghapus riwayat peminjaman barang.");
      return;
    }

    setIsDeletingBorrowing(true);
    setAdminErrorMsg(null);
    setAdminSuccessMsg(null);
    try {
      const res = await onDeleteBorrowing(borrowingToDelete.id);
      setIsDeletingBorrowing(false);
      if (typeof res === "object" && res.success) {
        setAdminSuccessMsg(res.message || `Riwayat peminjaman ${borrowingToDelete.itemName} (${borrowingToDelete.borrowerName}) berhasil dihapus.`);
        setBorrowingToDelete(null);
        setTimeout(() => setAdminSuccessMsg(null), 5000);
      } else if (res === true) {
        setAdminSuccessMsg(`Riwayat peminjaman ${borrowingToDelete.itemName} (${borrowingToDelete.borrowerName}) berhasil dihapus.`);
        setBorrowingToDelete(null);
        setTimeout(() => setAdminSuccessMsg(null), 5000);
      } else {
        setAdminErrorMsg(typeof res === "object" ? res.error || "Gagal menghapus riwayat peminjaman." : "Gagal menghapus riwayat peminjaman.");
      }
    } catch (err) {
      setIsDeletingBorrowing(false);
      setAdminErrorMsg("Terjadi kegagalan saat menghapus riwayat peminjaman.");
    }
  };

  const selectedItem = inventory.find(i => i.id === selectedItemId) || (inventory.length > 0 ? inventory[0] : null);
  const filteredInventory = inventory.filter(item => {
    const query = searchItem.toLowerCase().trim();
    if (!query) return true;
    const matchName = item.name.toLowerCase().includes(query);
    const matchLocation = item.location.toLowerCase().includes(query);
    const matchCategory = item.category ? item.category.toLowerCase().includes(query) : false;
    const matchCode = item.code ? item.code.toLowerCase().includes(query) : false;
    return matchName || matchLocation || matchCategory || matchCode;
  });

  const pendingBorrowings = borrowings.filter(b => b.status === "Menunggu Persetujuan");

  const filteredActiveBorrowings = borrowings.filter(
    b => (b.status === "Dipinjam" || b.status === "Menunggu Persetujuan" || b.status === "Ditolak") && 
    b.borrowerName.toLowerCase().includes(searchBorrowerName.toLowerCase())
  );

  const handleApprove = async (b: InventoryBorrowing) => {
    if (!onApproveBorrowing) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setAdminErrorMsg(null);
    setAdminSuccessMsg(null);
    setIsSubmitting(true);
    const res = await onApproveBorrowing(
      b.id, 
      activeAdminLevel, 
      asistenUser?.name || (activeAdminLevel === "admin1" ? "Aldy Prayogo, S. T." : "Iik Sumiati")
    );
    setIsSubmitting(false);
    if (res.success) {
      setAdminSuccessMsg(res.message || `Izin peminjaman untuk ${b.borrowerName} (${b.itemName}) berhasil disetujui!`);
      setTimeout(() => setAdminSuccessMsg(null), 5000);
    } else {
      setAdminErrorMsg(res.error || "Gagal menyetujui peminjaman.");
      setTimeout(() => setAdminErrorMsg(null), 6000);
    }
  };

  const handleReject = async (b: InventoryBorrowing) => {
    if (!onRejectBorrowing) return;
    const reason = window.prompt(`Masukkan alasan penolakan pengajuan peminjaman ${b.itemName} untuk ${b.borrowerName}:`, "Stok/keperluan operasional laboratorium");
    if (reason === null) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setAdminErrorMsg(null);
    setAdminSuccessMsg(null);
    setIsSubmitting(true);
    const res = await onRejectBorrowing(
      b.id, 
      activeAdminLevel, 
      asistenUser?.name || (activeAdminLevel === "admin1" ? "Aldy Prayogo, S. T." : "Iik Sumiati"),
      reason
    );
    setIsSubmitting(false);
    if (res.success) {
      setAdminSuccessMsg(`Pengajuan peminjaman ${b.itemName} untuk ${b.borrowerName} berhasil ditolak.`);
      setTimeout(() => setAdminSuccessMsg(null), 5000);
    } else {
      setAdminErrorMsg(res.error || "Gagal menolak peminjaman.");
      setTimeout(() => setAdminErrorMsg(null), 6000);
    }
  };

  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminErrorMsg(null);
    setAdminSuccessMsg(null);

    if (activeAdminLevel === "admin2") {
      setAdminErrorMsg("Akses Ditolak: Admin 2 tidak memiliki akses untuk menambahkan barang inventaris baru. Hanya Admin 1 yang diperbolehkan.");
      return;
    }

    if (!addName.trim()) {
      setAdminErrorMsg("Nama barang wajib diisi.");
      return;
    }
    if (!addCategory.trim()) {
      setAdminErrorMsg("Kategori barang wajib diisi.");
      return;
    }
    if (!addLocation.trim()) {
      setAdminErrorMsg("Lokasi penyimpanan barang wajib diisi.");
      return;
    }
    if (addTotalQty < 0) {
      setAdminErrorMsg("Jumlah total barang tidak boleh kurang dari 0.");
      return;
    }

    setIsSubmitting(true);
    const success = await onAddInventoryItem({
      code: addCode.trim() || undefined,
      name: addName,
      category: addCategory,
      location: addLocation,
      totalQty: addTotalQty,
      image: addImage,
      approvalAdmin: addApprovalAdmin
    });
    setIsSubmitting(false);

    if (success) {
      setAdminSuccessMsg("Barang baru berhasil ditambahkan!");
      setAddCode("");
      setAddName("");
      setAddTotalQty(10);
      setAddImage(null);
      setAddApprovalAdmin("both");
      setIsAddingItem(false);
      setTimeout(() => setAdminSuccessMsg(null), 4000);
    } else {
      setAdminErrorMsg("Gagal menambahkan barang ke inventaris.");
    }
  };

  const handleStartEdit = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setEditCode(item.code || "");
    setEditName(item.name);
    setEditCategory(item.category);
    setEditLocation(item.location);
    setEditTotalQty(item.totalQty);
    setEditAvailableQty(item.availableQty);
    setEditImage(item.image || null);
    setEditApprovalAdmin(item.approvalAdmin || "both");
    setAdminErrorMsg(null);
    setAdminSuccessMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditImage(null);
    setAdminErrorMsg(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminErrorMsg(null);
    setAdminSuccessMsg(null);

    if (activeAdminLevel === "admin2") {
      setAdminErrorMsg("Akses Ditolak: Admin 2 tidak memiliki kewenangan untuk mengubah data barang. Hanya Admin 1 yang diperbolehkan.");
      return;
    }

    if (!editName.trim()) {
      setAdminErrorMsg("Nama barang wajib diisi.");
      return;
    }
    if (!editCategory.trim()) {
      setAdminErrorMsg("Kategori wajib diisi.");
      return;
    }
    if (!editLocation.trim()) {
      setAdminErrorMsg("Lokasi penyimpanan wajib diisi.");
      return;
    }
    if (editTotalQty < 0) {
      setAdminErrorMsg("Jumlah total barang tidak boleh kurang dari 0.");
      return;
    }
    if (editAvailableQty < 0 || editAvailableQty > editTotalQty) {
      setAdminErrorMsg(`Jumlah tersedia harus antara 0 sampai ${editTotalQty}.`);
      return;
    }

    setIsSubmitting(true);
    const success = await onUpdateInventoryItem(editingItemId!, {
      code: editCode.trim() || undefined,
      name: editName,
      category: editCategory,
      location: editLocation,
      totalQty: editTotalQty,
      availableQty: editAvailableQty,
      image: editImage,
      approvalAdmin: editApprovalAdmin
    });
    setIsSubmitting(false);

    if (success) {
      setAdminSuccessMsg("Informasi barang berhasil diperbarui!");
      setEditingItemId(null);
      setEditImage(null);
      setTimeout(() => setAdminSuccessMsg(null), 4000);
    } else {
      setAdminErrorMsg("Gagal memperbarui data barang.");
    }
  };

  const handleDeleteItem = async (itemId: string, name: string) => {
    setAdminErrorMsg(null);
    setAdminSuccessMsg(null);

    if (activeAdminLevel === "admin2") {
      setAdminErrorMsg("Akses Ditolak: Admin 2 tidak diperbolehkan menghapus barang.");
      return;
    }

    setIsSubmitting(true);
    const success = await onDeleteInventoryItem(itemId);
    setIsSubmitting(false);

    if (success) {
      setAdminSuccessMsg(`Barang "${name}" berhasil dihapus dari inventaris.`);
      setConfirmDeleteId(null);
      if (selectedItemId === itemId) {
        setSelectedItemId("");
      }
      setTimeout(() => setAdminSuccessMsg(null), 4000);
    } else {
      setAdminErrorMsg("Gagal menghapus barang.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (activeAdminLevel === "admin2" && selectedItem?.approvalAdmin === "admin1_only") {
      setErrorMsg("Akses Ditolak: Barang ini hanya dapat diberikan izin peminjaman oleh Admin 1. Akun Admin 2 tidak memiliki kewenangan.");
      return;
    }

    if (!formBorrowerName.trim()) {
      setErrorMsg("Nama peminjam wajib diisi.");
      return;
    }
    if (formQty <= 0) {
      setErrorMsg("Jumlah barang yang dipinjam harus minimal 1.");
      return;
    }
    if (!formPurpose.trim()) {
      setErrorMsg("Keperluan peminjaman wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    const success = await onBorrowItem({
      itemId: selectedItemId,
      quantity: formQty,
      borrowerName: formBorrowerName,
      borrowerRole: activeRole,
      classroom: formClassroom,
      returnDate: formReturnDate,
      purpose: formPurpose,
      adminLevel: activeAdminLevel
    });
    setIsSubmitting(false);

    if (success) {
      setSuccessMsg(`Pengajuan peminjaman ${selectedItem?.name} berhasil dikirim! Status pengajuan: "Menunggu Persetujuan". Mohon menunggu persetujuan manual dari Admin 1 (semua jenis barang) atau Admin 2 (Iik Sumiati - barang tertentu).`);
      setFormBorrowerName("");
      setFormPurpose("");
      setFormQty(1);
      setFormClassroom("X-1");
      setTimeout(() => setSuccessMsg(null), 8000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Persona Bar */}
      <div className="bg-slate-800 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-700 text-amber-400 rounded-lg">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Simulasi Peran Pengguna</h4>
            <p className="text-xs text-slate-400">Atur peran Anda untuk simulasi hak batas peminjaman & manajemen inventaris.</p>
          </div>
        </div>
        <div className="flex bg-slate-700 p-1 rounded-xl w-full sm:w-auto">
          {(["Siswa", "Guru", "Laboran"] as const).map(role => (
            <button
              key={role}
              onClick={() => {
                if (role === "Laboran" && !asistenUser) {
                  if (onTriggerLogin) onTriggerLogin();
                  return;
                }
                setActiveRole(role);
                setErrorMsg(null);
                setSuccessMsg(null);
                if (role !== "Laboran") {
                  setAdminManageMode(false);
                  setEditingItemId(null);
                }
              }}
              className={`flex-1 sm:flex-none text-xs font-semibold px-5 py-2 rounded-lg transition-all ${
                activeRole === role 
                  ? "bg-blue-600 text-white shadow-xs" 
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Admin Category Info Bar */}
      {activeRole === "Laboran" && (
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${activeAdminLevel === "admin1" ? "bg-amber-400/20 text-amber-300 border border-amber-400/30" : "bg-indigo-400/20 text-indigo-300 border border-indigo-400/30"}`}>
              {activeAdminLevel === "admin1" ? <ShieldCheck className="h-5 w-5" /> : <Users className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white">Akun Admin Terautentikasi:</h4>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${activeAdminLevel === "admin1" ? "bg-amber-400 text-slate-950" : "bg-indigo-400 text-slate-950"}`}>
                  {activeAdminLevel === "admin1" ? "👑 Admin 1 (Akses Penuh)" : "👥 Admin 2 (Iik Sumiati)"}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-normal">
                {activeAdminLevel === "admin1" 
                  ? "Akses Pengelolaan Penuh: Berhak mengelola inventaris & menyetujui peminjaman SELURUH barang." 
                  : "Akses Terbatas (Iik Sumiati): Menyetujui peminjaman BARANG TERTENTU yang diizinkan untuk Admin 2. Persetujuan pengembalian barang dapat diakses oleh Admin 1 maupun Admin 2."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-700 flex items-center gap-2 text-xs font-bold text-slate-200">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Petugas:</span>
              <span className="text-white font-mono">{asistenUser?.name || (activeAdminLevel === "admin1" ? "Aldy Prayogo, S. T. (Admin 1)" : "Iik Sumiati (Admin 2)")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Inventory items collection list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-800">
                  {adminManageMode ? "Kelola Daftar Inventaris Lab" : "Persediaan Barang Inventaris Lab"}
                </h3>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {inventory.length} Barang
                </span>
              </div>
              {adminManageMode && (
                <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md border border-amber-200/50">
                  Mode Pengelolaan Aktif
                </span>
              )}
            </div>

            {/* Notification banners for Admin operations */}
            {adminSuccessMsg && (
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs flex items-start gap-2 border border-emerald-100 mb-4 animate-fadeIn">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{adminSuccessMsg}</span>
              </div>
            )}
            {adminErrorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs flex items-start gap-2 border border-red-100 mb-4 animate-fadeIn">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{adminErrorMsg}</span>
              </div>
            )}
            
            {/* Real-time Search Input for Inventory Items */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
                placeholder="Cari berdasarkan nama, kode barang, atau lokasi penyimpanan..."
                className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white text-slate-700 transition-all font-sans"
                id="inventory-item-search-input"
              />
              {searchItem && (
                <button
                  type="button"
                  onClick={() => setSearchItem("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                  title="Bersihkan pencarian"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {filteredInventory.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-5">
                  {searchItem ? (
                    <div>
                      <p className="font-semibold text-slate-600">Barang tidak ditemukan</p>
                      <p className="text-[11px] text-slate-400 mt-1">Tidak ada barang yang cocok dengan kata kunci "<span className="text-slate-700 font-medium">{searchItem}</span>"</p>
                      <button
                        type="button"
                        onClick={() => setSearchItem("")}
                        className="mt-2.5 text-xs text-blue-600 hover:text-blue-700 font-semibold underline cursor-pointer"
                      >
                        Reset Pencarian
                      </button>
                    </div>
                  ) : activeRole === "Laboran" ? (
                    <div className="py-2">
                      <div className="w-10 h-10 mx-auto mb-2.5 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Plus className="h-5 w-5" />
                      </div>
                      <p className="font-bold text-slate-700">Inventaris Masih Kosong</p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                        {activeAdminLevel === "admin1"
                          ? "Sebagai Admin 1, Anda dapat menambahkan dan mendaftarkan data barang inventaris baru melalui formulir di panel sebelah kanan."
                          : "Belum ada barang di inventaris. Penambahan data barang baru dikelola oleh Admin 1."}
                      </p>
                    </div>
                  ) : (
                    <div className="py-2">
                      <div className="w-10 h-10 mx-auto mb-2.5 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center">
                        <Package className="h-5 w-5" />
                      </div>
                      <p className="font-bold text-slate-700">Belum Ada Barang Inventaris</p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                        Daftar barang inventaris saat ini masih kosong. Data barang inventaris hanya dapat ditambahkan dan didaftarkan oleh <strong>Admin / Pengelola Lab</strong>.
                      </p>
                      {!asistenUser && (
                        <button
                          type="button"
                          onClick={onTriggerLogin}
                          className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl border border-blue-200 transition-all cursor-pointer"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Masuk Sebagai Admin
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                filteredInventory.map(item => {
                  const isSelected = selectedItemId === item.id;
                  const isEditingThis = editingItemId === item.id;
                  const isConfirmingDeleteThis = confirmDeleteId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!adminManageMode) {
                          setSelectedItemId(item.id);
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }
                      }}
                      className={`p-4 rounded-xl border transition-all ${
                        !adminManageMode ? "cursor-pointer" : ""
                      } ${
                        isEditingThis 
                          ? "border-amber-500 bg-amber-50/10 ring-1 ring-amber-500/20"
                          : isConfirmingDeleteThis
                            ? "border-red-500 bg-red-50/10 ring-1 ring-red-500/20"
                            : isSelected && !adminManageMode
                              ? "border-blue-600 bg-blue-50/10 ring-1 ring-blue-600/20"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                      id={`inventory-item-${item.id}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <div className="relative w-11 h-11 shrink-0 bg-slate-100 rounded-xl overflow-hidden border border-slate-200/60 shadow-2xs">
                              <img
                                src={item.image}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className={`p-2.5 rounded-xl shrink-0 ${
                              isEditingThis 
                                ? "bg-amber-500 text-white" 
                                : isConfirmingDeleteThis
                                  ? "bg-red-500 text-white"
                                  : isSelected && !adminManageMode
                                    ? "bg-blue-600 text-white" 
                                    : "bg-slate-50 text-slate-600"
                            }`}>
                              <Laptop className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-800">{item.name}</h4>
                              {item.code && (
                                <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 shrink-0">
                                  {item.code}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                              <span className="text-[10px] bg-slate-50 text-slate-500 font-semibold px-2 py-0.5 rounded-md border border-slate-100">
                                {item.category}
                              </span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                <MapPin className="h-3 w-3" /> {item.location}
                              </span>
                              {item.approvalAdmin === "admin1_only" ? (
                                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200/70 flex items-center gap-1 shrink-0">
                                  <ShieldAlert className="h-3 w-3 text-amber-600" />
                                  Izin: Admin 1 Saja
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200/70 flex items-center gap-1 shrink-0">
                                  <Users className="h-3 w-3 text-indigo-600" />
                                  Izin: Admin 1 & Admin 2
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Tersedia / Total</p>
                            <p className="text-sm font-extrabold text-slate-800">
                              {item.availableQty} <span className="text-[10px] font-semibold text-slate-400">/ {item.totalQty} Unit</span>
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                            item.availableQty > 0 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : "bg-red-50 text-red-700 border border-red-100"
                          }`}>
                            {item.availableQty > 0 ? "Bisa Dipinjam" : "Stok Habis"}
                          </span>
                        </div>
                      </div>

                      {/* Admin Controls Area */}
                      {adminManageMode && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                          {isConfirmingDeleteThis ? (
                            <div className="bg-red-50/50 p-2 rounded-lg border border-red-100 flex items-center justify-between w-full gap-4 animate-fadeIn">
                              <span className="text-[11px] font-semibold text-red-700 flex items-center gap-1">
                                <AlertCircle className="h-4 w-4 shrink-0" /> Yakin hapus barang ini?
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleDeleteItem(item.id, item.name)}
                                  disabled={isSubmitting}
                                  className="text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md cursor-pointer shadow-xs"
                                >
                                  Ya, Hapus
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 rounded-md cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {item.id}</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleStartEdit(item)}
                                  className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                                    isEditingThis 
                                      ? "bg-amber-500 border-amber-600 text-white shadow-xs" 
                                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  <Edit className="h-3 w-3" /> Ubah Data
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirmDeleteId(item.id);
                                    setEditingItemId(null);
                                    setAdminErrorMsg(null);
                                    setAdminSuccessMsg(null);
                                  }}
                                  className="text-[10px] font-bold bg-white border border-red-200 text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <Trash2 className="h-3 w-3" /> Hapus
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right column: Contextual Panel (Borrowing Form for Siswa/Guru vs Admin Forms/Info Panel) */}
        <div className="space-y-6">
          {activeRole === "Laboran" ? (
            /* ================= MODE ADMIN (LABORAN) ================= */
            activeAdminLevel === "admin1" ? (
              editingItemId !== null ? (
                /* ================= MODE EDIT BARANG (ADMIN 1) ================= */
                <div className="bg-white p-5 rounded-2xl border border-amber-300 shadow-sm flex flex-col animate-fadeIn">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-amber-100">
                    <div className="flex items-center gap-2">
                      <Edit className="h-5 w-5 text-amber-500" />
                      <h3 className="text-sm font-semibold text-slate-800">Edit Data Barang (Admin 1)</h3>
                    </div>
                    <button 
                      onClick={handleCancelEdit}
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEdit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Kode Barang</label>
                        <input
                          type="text"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          placeholder="Contoh: KB-LPT-001"
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white text-slate-700 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Barang</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Contoh: Laptop Lenovo ThinkPad L13"
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white text-slate-700 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Kategori</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white text-slate-700 font-sans"
                        >
                          <option value="Laptop">Laptop / Notebook</option>
                          <option value="Proyektor">Proyektor</option>
                          <option value="Kabel">Kabel & Konektor</option>
                          <option value="Aksesoris">Aksesoris Komputer</option>
                          <option value="Alat Praktikum">Alat Praktikum IoT</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Lokasi Penyimpanan</label>
                        <input
                          type="text"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          placeholder="Contoh: Lab Komputer A"
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white text-slate-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-amber-50/40 p-3 rounded-xl border border-amber-100">
                      <div>
                        <label className="block text-xs font-semibold text-amber-800 mb-1">Jumlah Total (Unit)</label>
                        <input
                          type="number"
                          min={0}
                          value={editTotalQty}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setEditTotalQty(val);
                            if (editAvailableQty > val) {
                              setEditAvailableQty(val);
                            }
                          }}
                          className="w-full text-xs border border-amber-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white text-slate-700 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-amber-800 mb-1">Tersedia (Unit)</label>
                        <input
                          type="number"
                          min={0}
                          max={editTotalQty}
                          value={editAvailableQty}
                          onChange={(e) => setEditAvailableQty(Math.max(0, Math.min(editTotalQty, parseInt(e.target.value, 10) || 0)))}
                          className="w-full text-xs border border-amber-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white text-slate-700 font-bold"
                        />
                      </div>
                    </div>

                    {/* Image Upload for Editing Inventory Item */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Foto Barang (Opsional)</label>
                      {editImage ? (
                        <div className="relative rounded-xl overflow-hidden border border-amber-200 bg-amber-50/10 p-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={editImage}
                              alt="Preview barang edit"
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 object-cover rounded-lg border border-amber-200/60"
                            />
                            <div>
                              <p className="text-[10px] font-bold text-amber-900">Foto Terpilih</p>
                              <p className="text-[9px] text-amber-700/80">Siap diperbarui</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditImage(null)}
                            className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-all cursor-pointer"
                            title="Hapus Foto"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative border border-dashed border-amber-200 rounded-xl hover:bg-amber-50/20 transition-all p-4 text-center cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleEditFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center gap-1.5 text-amber-700">
                            <Upload className="h-5 w-5 text-amber-500" />
                            <span className="text-[10px] font-bold text-amber-800">Klik atau seret foto baru ke sini</span>
                            <span className="text-[9px] text-slate-400">Format PNG, JPG, atau JPEG</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Opsi Izin Peminjaman Kategori Admin */}
                    <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
                      <label className="block text-xs font-bold text-amber-900 mb-2">Opsi Izin Peminjaman (Kategori Admin)</label>
                      <div className="space-y-2">
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="editApprovalAdmin"
                            value="both"
                            checked={editApprovalAdmin === "both"}
                            onChange={() => setEditApprovalAdmin("both")}
                            className="mt-0.5 text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Dapat diizinkan oleh Admin 1 & Admin 2</span>
                            <span className="text-[10px] text-slate-500 block">Kedua tingkat admin dapat menyetujui peminjaman barang ini</span>
                          </div>
                        </label>
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="editApprovalAdmin"
                            value="admin1_only"
                            checked={editApprovalAdmin === "admin1_only"}
                            onChange={() => setEditApprovalAdmin("admin1_only")}
                            className="mt-0.5 text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Hanya dapat diizinkan oleh Admin 1 Saja</span>
                            <span className="text-[10px] text-slate-500 block">Barang ini memerlukan kewenangan khusus dari Admin 1</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-normal">
                      💡 <strong>Catatan:</strong> "Tersedia" adalah sisa barang fisik yang siap dipinjam, pastikan nilainya sinkron jika ada yang sedang dipinjam siswa.
                    </p>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg p-3 transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <Save className="h-4 w-4" /> Simpan Perubahan
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg px-4 py-3 transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* ================= MODE TAMBAH BARANG BARU (ADMIN 1) ================= */
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col animate-fadeIn">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                    <PlusCircle className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-800">Tambah Barang Baru (Admin 1)</h3>
                  </div>

                  <form onSubmit={handleAddNewItem} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Kode Barang</label>
                        <input
                          type="text"
                          value={addCode}
                          onChange={(e) => setAddCode(e.target.value)}
                          placeholder="Contoh: KB-LPT-001 (Opsional)"
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Barang / Jenis</label>
                        <input
                          type="text"
                          value={addName}
                          onChange={(e) => setAddName(e.target.value)}
                          placeholder="Contoh: Proyektor Epson EB-X500"
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-sans"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Kategori Barang</label>
                      <select
                        value={addCategory}
                        onChange={(e) => setAddCategory(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-sans"
                      >
                        <option value="Laptop">Laptop / Notebook</option>
                        <option value="Proyektor">Proyektor</option>
                        <option value="Kabel">Kabel & Konektor</option>
                        <option value="Aksesoris">Aksesoris Komputer</option>
                        <option value="Alat Praktikum">Alat Praktikum IoT</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Lokasi Penyimpanan</label>
                      <input
                        type="text"
                        value={addLocation}
                        onChange={(e) => setAddLocation(e.target.value)}
                        placeholder="Contoh: Lemari Penyimpanan Lab B"
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Jumlah Unit Tersedia (Stok Awal)</label>
                      <input
                        type="number"
                        min={1}
                        value={addTotalQty}
                        onChange={(e) => setAddTotalQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-sans"
                      />
                    </div>

                    {/* Radio Option for Admin Authorization Level */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <label className="block text-xs font-bold text-slate-700 mb-2">Opsi Izin Peminjaman Barang Ini</label>
                      <div className="space-y-2">
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="addApprovalAdmin"
                            value="both"
                            checked={addApprovalAdmin === "both"}
                            onChange={() => setAddApprovalAdmin("both")}
                            className="mt-0.5 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-indigo-600" /> Admin 1 dan Admin 2
                            </span>
                            <span className="text-[10px] text-slate-500 block font-normal">
                              Kedua kategori admin diizinkan memberikan persetujuan peminjaman barang ini.
                            </span>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="addApprovalAdmin"
                            value="admin1_only"
                            checked={addApprovalAdmin === "admin1_only"}
                            onChange={() => setAddApprovalAdmin("admin1_only")}
                            className="mt-0.5 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-amber-900 block flex items-center gap-1">
                              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> Hanya Admin 1 Saja
                            </span>
                            <span className="text-[10px] text-slate-500 block font-normal">
                              Barang khusus yang hanya dapat diberikan izin peminjaman oleh Admin 1.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Image Upload for New Inventory Item */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Foto Barang (Opsional)</label>
                      {addImage ? (
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={addImage}
                              alt="Preview barang baru"
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200/60"
                            />
                            <div>
                              <p className="text-[10px] font-bold text-slate-700">Foto Terpilih</p>
                              <p className="text-[9px] text-slate-400">Siap diunggah</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAddImage(null)}
                            className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-all cursor-pointer"
                            title="Hapus Foto"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative border border-dashed border-slate-200 rounded-xl hover:bg-slate-50/50 transition-all p-4 text-center cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAddFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center gap-1.5 text-slate-400">
                            <Upload className="h-5 w-5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-600">Klik atau seret foto ke sini</span>
                            <span className="text-[9px] text-slate-400">Format PNG, JPG, atau JPEG</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-3 transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" /> Daftarkan Barang Baru
                    </button>
                  </form>
                </div>
              )
            ) : (
              /* ================= MODE PANEL INFORMASI & HAK AKSES BARANG (ADMIN 2) ================= */
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col animate-fadeIn">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800">Panel Informasi & Status Barang (Admin 2)</h3>
                </div>

                {selectedItem ? (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                      {selectedItem.image && (
                        <div className="w-14 h-14 bg-white rounded-lg overflow-hidden border border-slate-200/60 shrink-0 shadow-3xs">
                          <img
                            src={selectedItem.image}
                            alt={selectedItem.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Barang Terpilih</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-extrabold text-slate-700">{selectedItem.name}</span>
                          {selectedItem.code && (
                            <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                              {selectedItem.code}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1 block">Kategori: <strong>{selectedItem.category}</strong> | Lokasi: <strong>{selectedItem.location}</strong></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/60 text-center">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Stok Tersedia</span>
                        <span className="text-lg font-extrabold text-indigo-950">{selectedItem.availableQty} Unit</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Total Fisik</span>
                        <span className="text-lg font-extrabold text-indigo-950">{selectedItem.totalQty} Unit</span>
                      </div>
                    </div>

                    {/* Permission status for Admin 2 */}
                    {selectedItem.approvalAdmin === "admin1_only" ? (
                      <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs flex items-start gap-2.5 text-amber-900">
                        <Lock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <strong className="block font-bold text-amber-950">Akses Persetujuan Dibatasi (Admin 1 Saja)</strong>
                          <span className="text-[11px] text-amber-800 leading-relaxed block mt-1">
                            Barang ini dikategorikan khusus. Pengajuan peminjaman barang ini <strong>hanya dapat disetujui oleh Admin 1</strong>. Akun Admin 2 tidak memiliki hak memberikan izin untuk barang ini.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs flex items-start gap-2.5 text-emerald-900">
                        <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                        <div>
                          <strong className="block font-bold text-emerald-950">Berhak Menyetujui Peminjaman</strong>
                          <span className="text-[11px] text-emerald-800 leading-relaxed block mt-1">
                            Anda (Admin 2) memiliki kewenangan resmi untuk memverifikasi dan menyetujui pengajuan peminjaman untuk barang ini.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500 leading-relaxed space-y-1">
                      <strong className="block text-slate-700 font-bold">ℹ️ Ketentuan Akses Admin 2 (Iik Sumiati):</strong>
                      <p>• <strong>Persetujuan Peminjaman:</strong> Hanya dapat menyetujui peminjaman barang tertentu yang diizinkan untuk Admin 2 (Admin 1 dapat menyetujui seluruh barang).</p>
                      <p>• <strong>Persetujuan Pengembalian:</strong> Bebas diakses dan diproses oleh Admin 1 maupun Admin 2 untuk semua barang.</p>
                      <p>• Admin 2 tidak memiliki hak untuk mengelola (tambah/edit/hapus) daftar inventaris.</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Pilih salah satu barang di daftar sebelah kiri untuk memeriksa rincian stok dan wewenang persetujuan Admin 2.
                  </div>
                )}
              </div>
            )
          ) : (
            /* ================= MODE PEMINJAMAN BARANG (UNTUK SISWA & GURU) ================= */
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-800">Formulir Peminjaman</h3>
              </div>

              {selectedItem ? (
                <form onSubmit={handleSubmit} className="space-y-4 flex-1">
                  {errorMsg && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs flex items-start gap-2 border border-red-100">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                  {successMsg && (
                    <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs flex items-start gap-2 border border-emerald-100">
                      <Check className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                    {selectedItem.image && (
                      <div className="w-14 h-14 bg-white rounded-lg overflow-hidden border border-slate-200/60 shrink-0 shadow-3xs">
                        <img
                          src={selectedItem.image}
                          alt={selectedItem.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Barang Terpilih</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-extrabold text-slate-700">{selectedItem.name}</span>
                        {selectedItem.code && (
                          <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                            {selectedItem.code}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">Stok saat ini: <strong>{selectedItem.availableQty} unit</strong></span>
                    </div>
                  </div>

                  {/* Approval Permission Badge */}
                  {selectedItem.approvalAdmin === "admin1_only" ? (
                    <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl text-xs flex items-start gap-2.5 text-amber-900">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <span className="font-bold block text-amber-950">Izin Peminjaman: Admin 1 Saja</span>
                        <span className="text-[10px] text-amber-800 leading-tight block mt-0.5">
                          Barang ini dikategorikan khusus dan hanya dapat diberikan izin peminjaman oleh <strong>Admin 1</strong>.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl text-xs flex items-start gap-2.5 text-indigo-900">
                      <Users className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
                      <div>
                        <span className="font-bold block text-indigo-950">Izin Peminjaman: Admin 1 & Admin 2</span>
                        <span className="text-[10px] text-indigo-700 leading-tight block mt-0.5">
                          Baik <strong>Admin 1</strong> maupun <strong>Admin 2</strong> memiliki wewenang memberikan izin peminjaman untuk barang ini.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Jumlah Pinjam (Unit)</label>
                    <input
                      type="number"
                      min={1}
                      max={selectedItem.availableQty}
                      value={formQty}
                      onChange={(e) => setFormQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      disabled={selectedItem.availableQty <= 0}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-sans"
                    />
                  </div>

                  {/* Borrower Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Nama Peminjam {activeRole === "Guru" && <span className="text-blue-600 font-bold">(Pilih dari Daftar Guru)</span>}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={formBorrowerName}
                        onChange={(e) => {
                          setFormBorrowerName(e.target.value);
                          if (activeRole === "Guru") {
                            setShowTeacherSuggestions(true);
                          }
                        }}
                        onFocus={(e) => {
                          if (activeRole === "Guru") {
                            setShowTeacherSuggestions(true);
                          }
                          e.target.select();
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowTeacherSuggestions(false), 200);
                        }}
                        placeholder={activeRole === "Guru" ? "Ketik nama atau pilih guru dari daftar..." : "Masukkan nama lengkap"}
                        className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-14 p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700"
                      />
                      <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
                        {formBorrowerName && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormBorrowerName("");
                              if (activeRole === "Guru") {
                                setShowTeacherSuggestions(true);
                              }
                            }}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                            title="Hapus nama"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {activeRole === "Guru" && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setShowTeacherSuggestions(!showTeacherSuggestions);
                            }}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100 transition-colors"
                            title="Tampilkan daftar guru"
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${showTeacherSuggestions ? "rotate-180" : ""}`} />
                          </button>
                        )}
                      </div>
                      {activeRole === "Guru" && showTeacherSuggestions && (
                        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 divide-y divide-slate-100">
                          {(() => {
                            const isExactMatch = TEACHERS.some(t => t === formBorrowerName);
                            const filtered = (isExactMatch || !formBorrowerName.trim())
                              ? TEACHERS
                              : TEACHERS.filter(t => t.toLowerCase().includes(formBorrowerName.toLowerCase()));

                            if (filtered.length === 0) {
                              return <div className="p-2.5 text-xs text-slate-400 italic">Guru tidak ditemukan</div>;
                            }

                            return filtered.map((teacher) => (
                              <button
                                key={teacher}
                                type="button"
                                onMouseDown={() => {
                                  setFormBorrowerName(teacher);
                                  setShowTeacherSuggestions(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 font-medium transition-colors flex items-center justify-between ${
                                  formBorrowerName === teacher ? "bg-blue-50/70 text-blue-700 font-bold" : ""
                                }`}
                              >
                                <span>{teacher}</span>
                                {formBorrowerName === teacher && (
                                  <span className="text-[10px] text-blue-600 font-semibold bg-blue-100 px-1.5 py-0.5 rounded">Terpilih</span>
                                )}
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kelas Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Kelas Peminjam</label>
                    <select
                      value={formClassroom}
                      onChange={(e) => setFormClassroom(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-sans"
                      id="borrow-classroom-selector"
                    >
                      {CLASSROOMS.map(cls => (
                        <option key={cls} value={cls}>{formatClassroomName(cls)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Return Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Tanggal Pengembalian</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="date"
                        value={formReturnDate}
                        onChange={(e) => setFormReturnDate(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Tujuan / Deskripsi Pemakaian</label>
                    <textarea
                      value={formPurpose}
                      onChange={(e) => setFormPurpose(e.target.value)}
                      placeholder="Contoh: Praktek mandiri tugas IoT atau presentasi media ajar"
                      rows={3}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 resize-none"
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || selectedItem.availableQty <= 0}
                    className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-3 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {selectedItem.availableQty <= 0 
                      ? "Stok Tidak Tersedia" 
                      : isSubmitting 
                        ? "Memproses..." 
                        : `Ajukan Peminjaman (${activeRole})`}
                  </button>
                </form>
              ) : (
                <div className="text-center py-10 px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 shadow-2xs mx-auto mb-3 flex items-center justify-center text-slate-400">
                    <Package className="h-6 w-6 text-slate-400" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">
                    {inventory.length === 0 ? "Inventaris Masih Kosong" : "Belum Ada Barang Dipilih"}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    {inventory.length === 0 
                      ? "Saat ini belum ada data barang inventaris yang terdaftar. Data barang inventaris hanya dapat ditambahkan oleh Admin / Pengelola Lab." 
                      : "Pilih salah satu barang di daftar sebelah kiri untuk mengisi formulir peminjaman barang."}
                  </p>
                  {inventory.length === 0 && !asistenUser && (
                    <button
                      type="button"
                      onClick={onTriggerLogin}
                      className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl border border-blue-200 transition-all cursor-pointer"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Masuk Sebagai Admin
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Borrowing log history table or search for Peminjam */}
      {activeRole === "Laboran" ? (
        <div className="space-y-6">
          {/* Section Persetujuan Pengajuan Peminjaman Barang Manual */}
          <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs animate-fadeIn">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Pengajuan Peminjaman Menunggu Persetujuan ({pendingBorrowings.length})
                </h3>
              </div>
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-semibold border border-amber-200/60">
                Persetujuan Manual Admin
              </span>
            </div>

            {pendingBorrowings.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                🟢 Belum ada pengajuan peminjaman barang yang menunggu persetujuan.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBorrowings.map(b => {
                  const item = inventory.find(i => i.id === b.itemId);
                  const isAdmin1Only = item?.approvalAdmin === "admin1_only";
                  const canApprove = activeAdminLevel === "admin1" || !isAdmin1Only;

                  return (
                    <div key={b.id} className="p-4 rounded-xl border border-amber-100 bg-amber-50/20 hover:bg-amber-50/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-800">{b.itemName}</span>
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                            {b.quantity} unit
                          </span>
                          {isAdmin1Only ? (
                            <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                              <Lock className="h-3 w-3 text-amber-600" /> Khusus Admin 1
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                              <Users className="h-3 w-3 text-indigo-600" /> Admin 1 & Admin 2 (Iik Sumiati)
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 font-medium">
                          Peminjam: <strong className="text-slate-800">{b.borrowerName}</strong> ({b.borrowerRole}{b.classroom ? ` • ${formatClassroomName(b.classroom)}` : ""})
                        </div>

                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3">
                          <span>Tanggal Pinjam: <strong>{b.borrowDate}</strong></span>
                          <span>•</span>
                          <span>Batas Kembali: <strong>{b.returnDate}</strong></span>
                        </div>

                        {b.purpose && (
                          <p className="text-[11px] text-slate-500 italic bg-white/80 p-2 rounded-lg border border-slate-200/60 mt-1">
                            "{b.purpose}"
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        {canApprove ? (
                          <button
                            onClick={() => handleApprove(b)}
                            disabled={isSubmitting}
                            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" /> Beri Izin (Setujui)
                          </button>
                        ) : (
                          <div className="flex flex-col items-end">
                            <button
                              disabled
                              className="text-xs font-bold bg-slate-200 text-slate-400 px-3.5 py-2 rounded-xl border border-slate-300 cursor-not-allowed flex items-center gap-1.5"
                              title="Barang ini berlabel Khusus Admin 1. Akun Admin 2 (Iik Sumiati) tidak memiliki kewenangan."
                            >
                              <Lock className="h-3.5 w-3.5" /> Memerlukan Izin Admin 1
                            </button>
                            <span className="text-[9px] text-amber-700 font-semibold mt-1">Hanya Admin 1 yang dapat menyetujui</span>
                          </div>
                        )}

                        <button
                          onClick={() => handleReject(b)}
                          disabled={isSubmitting}
                          className="text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" /> Tolak
                        </button>

                        {activeAdminLevel === "admin1" && (
                          <button
                            type="button"
                            onClick={() => setBorrowingToDelete(b)}
                            disabled={isSubmitting}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer border border-slate-200 hover:border-red-200"
                            title="Hapus Pengajuan Riwayat Ini (Admin 1)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Daftar Semua Riwayat Transaksi */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-800">Daftar Transaksi Peminjaman Inventaris</h3>
              </div>
              {activeAdminLevel === "admin1" && (
                <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2.5 py-1 rounded-lg border border-amber-200/60 flex items-center gap-1 self-start sm:self-auto">
                  <ShieldCheck className="h-3 w-3 text-amber-600" /> Hak Hapus Riwayat Aktif (Admin 1)
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400">
                    <th className="py-2.5">Barang</th>
                    <th className="py-2.5">Peminjam</th>
                    <th className="py-2.5">Tanggal Pinjam</th>
                    <th className="py-2.5">Batas Pengembalian</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {borrowings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">Belum ada transaksi peminjaman tercatat.</td>
                    </tr>
                  ) : (
                    borrowings.map(b => {
                      const today = new Date().toISOString().split("T")[0];
                      const isOverdue = b.status === "Dipinjam" && b.returnDate < today;
                      const item = inventory.find(i => i.id === b.itemId);
                      const isAdmin1Only = item?.approvalAdmin === "admin1_only";
                      const canApprove = activeAdminLevel === "admin1" || !isAdmin1Only;

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/40">
                          <td className="py-3 font-semibold text-slate-700">
                            {b.itemName}
                            <span className="block text-[10px] text-slate-400 font-medium">Qty: {b.quantity} unit</span>
                          </td>
                          <td className="py-3">
                            <div className="font-semibold text-slate-600">{b.borrowerName}</div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {b.borrowerRole}{b.classroom ? ` • ${formatClassroomName(b.classroom)}` : ""}
                            </div>
                          </td>
                          <td className="py-3 text-slate-500 font-medium">{b.borrowDate}</td>
                          <td className="py-3">
                            <div className={`font-semibold ${isOverdue ? "text-red-600" : "text-slate-500"}`}>{b.returnDate}</div>
                            {b.actualReturnDate && (
                              <div className="text-[10px] text-emerald-600 font-medium mt-1 space-y-0.5">
                                <div>Dikembalikan: {b.actualReturnDate} {b.actualReturnTime ? `@${b.actualReturnTime}` : ""}</div>
                                {b.receiverName && <div className="text-[9px] text-slate-400">Penerima: {b.receiverName}</div>}
                                {b.returnStatus && (
                                  <div className="text-[9px] font-bold">
                                    Keterangan: <span className={b.returnStatus === "Tepat Waktu" ? "text-emerald-600" : "text-red-600"}>{b.returnStatus}</span>
                                  </div>
                                )}
                                {b.evidenceImage && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage(b.evidenceImage!)}
                                    className="mt-1 text-[9px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/50 hover:bg-blue-100 transition-all inline-flex"
                                  >
                                    <Camera className="h-2.5 w-2.5" /> Lihat Bukti Foto
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3">
                            {b.status === "Menunggu Persetujuan" ? (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200/80 inline-flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" /> Menunggu Persetujuan
                              </span>
                            ) : b.status === "Ditolak" ? (
                              <div>
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200/80">
                                  Ditolak
                                </span>
                                {b.rejectionReason && (
                                  <div className="text-[9px] text-red-600 mt-1 max-w-xs italic">
                                    "{b.rejectionReason}"
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                  b.status === "Dikembalikan" 
                                    ? "bg-emerald-50 text-emerald-700" 
                                    : isOverdue 
                                      ? "bg-red-100 text-red-700" 
                                      : "bg-blue-50 text-blue-700"
                                }`}>
                                  {isOverdue ? "Terlambat" : b.status}
                                </span>
                                {b.approvedBy && (
                                  <div className="text-[9px] text-slate-400 mt-0.5">
                                    Izin: {b.approvedBy}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {b.status === "Menunggu Persetujuan" ? (
                                <>
                                  {canApprove ? (
                                    <button
                                      onClick={() => handleApprove(b)}
                                      disabled={isSubmitting}
                                      className="text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                                    >
                                      <Check className="h-3 w-3" /> Setujui
                                    </button>
                                  ) : (
                                    <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                      Khusus Admin 1
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleReject(b)}
                                    disabled={isSubmitting}
                                    className="text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <X className="h-3 w-3" /> Tolak
                                  </button>
                                </>
                              ) : b.status === "Dipinjam" ? (
                                <button
                                  onClick={() => handleStartReturn(b)}
                                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1.5 inline-flex transition-all cursor-pointer"
                                  title="Kembalikan Barang"
                                >
                                  <CornerDownLeft className="h-3 w-3" /> Kembalikan
                                </button>
                              ) : null}

                              {/* Admin 1 Delete Borrowing History button */}
                              {activeAdminLevel === "admin1" && (
                                <button
                                  type="button"
                                  onClick={() => setBorrowingToDelete(b)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer border border-transparent hover:border-red-100"
                                  title="Hapus Riwayat Peminjaman (Admin 1)"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <CornerDownLeft className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-800">Cari & Cek Status Peminjaman Barang</h3>
          </div>

          <p className="text-xs text-slate-500 mb-4 leading-normal">
            Peminjam tidak memiliki akses untuk melihat semua riwayat transaksi. Silakan cari nama lengkap Anda di bawah ini untuk mengecek status persetujuan atau mengembalikan barang yang sedang Anda pinjam.
          </p>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nama Peminjam</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik nama lengkap Anda untuk mencari barang..."
                value={searchBorrowerName}
                onChange={(e) => setSearchBorrowerName(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-700"
              />
            </div>
          </div>

          {searchBorrowerName.trim() === "" ? (
            <div className="text-center py-8 border border-dashed border-slate-100 rounded-xl bg-slate-50/50 text-slate-400 text-xs">
              Masukkan nama Anda pada kolom di atas untuk menampilkan pengajuan atau barang pinjaman Anda.
            </div>
          ) : filteredActiveBorrowings.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-150 rounded-xl bg-slate-50/30 text-slate-500 text-xs">
              Tidak ditemukan pengajuan atau peminjaman aktif untuk nama <strong className="text-slate-700">"{searchBorrowerName}"</strong>.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-500 mb-1">Daftar Pengajuan & Peminjaman Ditemukan ({filteredActiveBorrowings.length}):</div>
              {filteredActiveBorrowings.map(b => {
                const today = new Date().toISOString().split("T")[0];
                const isOverdue = b.status === "Dipinjam" && b.returnDate < today;

                return (
                  <div 
                    key={b.id} 
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      b.status === "Menunggu Persetujuan"
                        ? "border-amber-200 bg-amber-50/30"
                        : b.status === "Ditolak"
                          ? "border-red-200 bg-red-50/30"
                          : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="text-xs font-extrabold text-slate-800">{b.itemName}</h4>
                        {b.status === "Menunggu Persetujuan" ? (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Menunggu Persetujuan Admin
                          </span>
                        ) : b.status === "Ditolak" ? (
                          <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full border border-red-300">
                            Ditolak
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                            Disetujui / Dipinjam
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-500 font-medium">Jumlah: <span className="text-slate-700 font-bold">{b.quantity} unit</span></p>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-slate-500">
                        <span>Tanggal Pengajuan: <strong>{b.borrowDate}</strong></span>
                        <span>•</span>
                        <span className={isOverdue ? "text-red-600 font-bold" : "text-slate-500"}>
                          Rencana Kembali: <strong>{b.returnDate}</strong> {isOverdue && "(Terlambat)"}
                        </span>
                      </div>

                      {b.purpose && (
                        <p className="text-[10px] text-slate-500 mt-1.5 italic">Keperluan: "{b.purpose}"</p>
                      )}

                      {b.status === "Menunggu Persetujuan" && (
                        <div className="mt-2 text-[10px] text-amber-800 bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                          ℹ️ Pengajuan Anda sedang dalam antrean persetujuan manual oleh Admin 1 (seluruh barang) atau Admin 2 (Iik Sumiati - barang tertentu).
                        </div>
                      )}

                      {b.status === "Ditolak" && b.rejectionReason && (
                        <div className="mt-2 text-[10px] text-red-800 bg-red-100/60 p-2 rounded-lg border border-red-200">
                          ⚠️ Alasan penolakan: "{b.rejectionReason}"
                        </div>
                      )}
                    </div>
                    
                    {b.status === "Dipinjam" && (
                      <button
                        type="button"
                        onClick={() => handleStartReturn(b)}
                        className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-all shadow-xs shrink-0 self-start sm:self-center cursor-pointer flex items-center gap-1"
                      >
                        <CornerDownLeft className="h-3.5 w-3.5" /> Kembalikan Barang
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Form Pengembalian Barang */}
      {returningBorrowing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="return-form-modal">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CornerDownLeft className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">Form Pengembalian Barang</h3>
              </div>
              <button
                type="button"
                onClick={() => setReturningBorrowing(null)}
                className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleConfirmReturn} className="flex flex-col max-h-[calc(100vh-8rem)]">
              {/* Scrollable fields area */}
              <div className="overflow-y-auto p-6 space-y-4 flex-1">
                {/* Info Box */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 text-xs">
                  <div className="font-bold text-slate-800">{returningBorrowing.itemName}</div>
                  <div className="text-slate-500 mt-1">
                    Peminjam: <strong className="text-slate-700">{returningBorrowing.borrowerName}</strong> ({returningBorrowing.borrowerRole})
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Jumlah Pinjam: <strong className="text-slate-700">{returningBorrowing.quantity} unit</strong>
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Batas Kembali: <strong className="text-slate-700">{returningBorrowing.returnDate}</strong>
                  </div>
                </div>

                {/* Tanggal Pengembalian (Otomatis Terdeteksi) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Tanggal Pengembalian (Terdeteksi Otomatis)</label>
                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 flex items-center gap-2 text-slate-700 text-xs">
                    <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">{returnActualDate}</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Hari Ini)</span>
                  </div>
                </div>

                {/* Penerima Barang (Diisi oleh Peminjam) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-0.5">Penerima Barang (Diisi oleh Peminjam)</label>
                  <p className="text-[10px] text-slate-400 mb-1.5">*Harap diisi oleh peminjam dengan nama guru, asisten, atau petugas lab yang menerima.</p>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={returnReceiver}
                      onChange={(e) => setReturnReceiver(e.target.value)}
                      placeholder="Contoh: Aldy Prayogo, S. T."
                      className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-700"
                    />
                  </div>
                </div>

                {/* Bukti Pengembalian (peminjam mengunggah foto dari galeri atau kamera) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bukti Pengembalian (Ambil Foto/Galeri)</label>
                  <div className="border border-dashed border-slate-200 hover:border-emerald-300 rounded-xl p-4 bg-slate-50 transition-all text-center relative cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      required={!returnEvidenceImage}
                    />
                    {returnEvidenceImage ? (
                      <div className="space-y-2 relative z-20">
                        <img src={returnEvidenceImage} alt="Bukti Foto" className="max-h-36 mx-auto rounded-lg shadow-sm border border-slate-200" />
                        <p className="text-[10px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                          <Check className="h-3 w-3" /> Foto Berhasil Ditambahkan
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setReturnEvidenceImage(null);
                          }}
                          className="text-[10px] text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-500">
                        <Camera className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                        <span className="block text-xs font-bold text-slate-600">Ambil Foto / Pilih Gambar</span>
                        <span className="block text-[10px]">Klik untuk mengambil gambar lewat kamera atau galeri</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Ketepatan Waktu (Otomatis) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Status Pengembalian</label>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Sistem Deteksi Otomatis:</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      returnStatus === "Tepat Waktu"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                      {returnStatus === "Tepat Waktu" ? "🟢 Tepat Waktu" : "🔴 Terlambat"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Footer) */}
              <div className="flex gap-2.5 p-6 border-t border-slate-100 bg-slate-50 flex-row">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-3 transition-all cursor-pointer shadow-md disabled:opacity-50 text-center"
                >
                  {isSubmitting ? "Menyimpan..." : "Konfirmasi Pengembalian"}
                </button>
                <button
                  type="button"
                  onClick={() => setReturningBorrowing(null)}
                  className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl px-4 py-3 transition-all cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Bukti Foto */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fadeIn" onClick={() => setPreviewImage(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-1.5 bg-slate-900/40 text-white hover:bg-slate-900/60 rounded-full transition-all cursor-pointer z-10"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-800">
              Bukti Pengembalian Barang
            </div>
            <div className="p-4 flex justify-center bg-slate-950">
              <img src={previewImage} alt="Bukti Pengembalian" className="max-h-[70vh] object-contain rounded-lg shadow-inner" />
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Riwayat Peminjaman (Admin 1 Only) */}
      {borrowingToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fadeIn" onClick={() => setBorrowingToDelete(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-scaleUp" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-xs">
                <Trash2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800 mb-1">
                Hapus Riwayat Peminjaman?
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Tindakan ini hanya dapat dilakukan oleh <strong>Admin 1 (Aldy Prayogo, S. T.)</strong> dan akan menghapus catatan transaksi peminjaman ini secara permanen dari sistem.
              </p>

              <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-left space-y-2 mb-5 text-xs text-slate-700">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span className="text-slate-400 font-medium">Barang:</span>
                  <span className="font-bold text-slate-800">{borrowingToDelete.itemName} ({borrowingToDelete.quantity} unit)</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span className="text-slate-400 font-medium">Peminjam:</span>
                  <span className="font-bold text-slate-800">{borrowingToDelete.borrowerName} ({borrowingToDelete.borrowerRole})</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span className="text-slate-400 font-medium">Waktu Pinjam:</span>
                  <span className="font-medium text-slate-700">{borrowingToDelete.borrowDate} s/d {borrowingToDelete.returnDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Status Saat Ini:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    borrowingToDelete.status === "Dikembalikan" ? "bg-emerald-100 text-emerald-800" :
                    borrowingToDelete.status === "Dipinjam" ? "bg-blue-100 text-blue-800" :
                    borrowingToDelete.status === "Ditolak" ? "bg-red-100 text-red-800" :
                    "bg-amber-100 text-amber-800"
                  }`}>
                    {borrowingToDelete.status}
                  </span>
                </div>
              </div>

              {borrowingToDelete.status === "Dipinjam" && (
                <div className="bg-blue-50 border border-blue-200/60 rounded-xl p-3 text-[11px] text-blue-800 text-left mb-5 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                  <span>
                    Karena barang ini masih berstatus "Dipinjam", sistem akan secara otomatis mengembalikan <strong>{borrowingToDelete.quantity} unit</strong> ke persediaan inventaris aktif setelah dihapus.
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setBorrowingToDelete(null)}
                  disabled={isDeletingBorrowing}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteBorrowing}
                  disabled={isDeletingBorrowing}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl transition-all cursor-pointer shadow-md shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isDeletingBorrowing ? "Menghapus..." : "Ya, Hapus Riwayat"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
