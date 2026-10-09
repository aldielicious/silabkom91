export type UserRole = "Guru" | "Siswa" | "Laboran";

export interface LabRoom {
  id: string;
  name: string;
  capacity: number;
  pcCount?: number;
  equipment: string[];
  status: "Tersedia" | "Digunakan" | "Pemeliharaan";
}

export interface SessionSlot {
  id: string;
  name: string;
  time: string;
}

export interface LabBooking {
  id: string;
  labId: string;
  labName: string;
  date: string; // YYYY-MM-DD
  sessionId: string;
  sessionName: string;
  sessionTime: string;
  startHour?: number; // Jam Pelajaran Mulai (1-10)
  endHour?: number;   // Jam Pelajaran Selesai (1-10)
  userName: string;
  userRole: UserRole;
  classroom?: string; // Optional class info (X-1 to XII-12)
  purpose: string;
  status: "Menunggu" | "Disetujui" | "Ditolak";
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  code?: string;
  name: string;
  category: string;
  totalQty: number;
  availableQty: number;
  location: string;
  image?: string | null;
  approvalAdmin?: "admin1_only" | "both"; // 'admin1_only' = Admin 1 saja, 'both' = Admin 1 & Admin 2
}

export interface AsistenUser {
  username: string;
  name: string;
  role: string;
  adminLevel?: "admin1" | "admin2";
}

export interface InventoryBorrowing {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  borrowerName: string;
  borrowerRole: UserRole;
  classroom?: string; // Optional class info (X-1 to XII-12)
  borrowDate: string; // YYYY-MM-DD
  returnDate: string; // YYYY-MM-DD (expected)
  actualReturnDate: string | null; // YYYY-MM-DD (actual)
  actualReturnTime?: string | null; // HH:MM (actual)
  receiverName?: string | null;     // Nama penerima pengembalian
  returnStatus?: "Tepat Waktu" | "Terlambat" | null; // Status ketepatan waktu
  evidenceImage?: string | null;    // Foto bukti pengembalian (Base64)
  purpose: string;
  status: "Menunggu Persetujuan" | "Dipinjam" | "Dikembalikan" | "Terlambat" | "Ditolak";
  approvedBy?: string | null;
  approvedByAdminLevel?: "admin1" | "admin2" | null;
  rejectionReason?: string | null;
  createdAt: string;
}

export interface NotificationLog {
  id: string;
  title: string;
  message: string;
  type: "booking" | "borrow" | "system";
  createdAt: string;
  isRead: boolean;
}
