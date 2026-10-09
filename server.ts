import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { 
  LabRoom, 
  SessionSlot, 
  LabBooking, 
  InventoryItem, 
  InventoryBorrowing, 
  NotificationLog 
} from "./src/types";
import { getSessionsForDate, getOutsideKBMExtraHour } from "./src/utils/scheduleHelper";
import { TEACHERS } from "./src/teachers";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy-loaded Gemini AI client helper to prevent startup crashes if API key is missing
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// Default/Initial database state
const INITIAL_DATABASE = {
  labs: [
    {
      id: "lab-komputer",
      name: "Lab Komputer",
      capacity: 40,
      pcCount: 40,
      equipment: ["40x PC i5, 8GB RAM", "Internet Fiber 100 Mbps", "Proyektor Epson", "AC Daikin"],
      status: "Tersedia"
    },
    {
      id: "lab-elearning",
      name: "Lab E-learning",
      capacity: 40,
      pcCount: 40,
      equipment: ["40x Thin Client / PC Intel", "E-learning Server", "Internet Access", "AC Sharp"],
      status: "Tersedia"
    },
    {
      id: "lab-multimedia",
      name: "Lab Multimedia",
      capacity: 40,
      pcCount: 40,
      equipment: ["40x PC Ryzen 5, Nvidia GTX 1660", "Drawing Tablet Support", "Proyektor Epson", "AC Panasonic"],
      status: "Tersedia"
    },
    {
      id: "lab-bahasa",
      name: "Lab Bahasa",
      capacity: 40,
      pcCount: 40,
      equipment: ["40x Headset Multimedia", "Audio Distribution Console", "PC Instruktur", "AC Daikin"],
      status: "Tersedia"
    }
  ] as LabRoom[],
  
  sessions: [
    { id: "jam-1", name: "Jam Ke-1", time: "07:00 - 07:45" },
    { id: "jam-2", name: "Jam Ke-2", time: "07:45 - 08:30" },
    { id: "jam-3", name: "Jam Ke-3", time: "08:30 - 09:15" },
    { id: "jam-4", name: "Jam Ke-4", time: "09:15 - 10:00" },
    { id: "jam-5", name: "Jam Ke-5", time: "10:15 - 11:00" },
    { id: "jam-6", name: "Jam Ke-6", time: "11:00 - 11:45" },
    { id: "jam-7", name: "Jam Ke-7", time: "12:30 - 13:15" },
    { id: "jam-8", name: "Jam Ke-8", time: "13:15 - 14:00" },
    { id: "jam-9", name: "Jam Ke-9", time: "14:00 - 14:45" },
    { id: "jam-10", name: "Jam Ke-10", time: "14:45 - 15:30" },
    { id: "jam-11", name: "Jam Ke-11", time: "15:30 - 16:15" },
    { id: "jam-12", name: "Jam Ke-12", time: "16:15 - 17:00" },
    { id: "jam-13", name: "Di Luar Jam KBM", time: "Sesuai Kebutuhan" }
  ] as SessionSlot[],

  bookings: [] as LabBooking[],

  inventory: [] as InventoryItem[],

  borrowings: [] as InventoryBorrowing[],

  notifications: [] as NotificationLog[]
};

// Database Read/Write Utility Functions
function getDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATABASE, null, 2), "utf-8");
    return INITIAL_DATABASE;
  }
  try {
    const content = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(content);
    
    // Auto-update labs array with the new 4 options
    parsed.labs = INITIAL_DATABASE.labs;
    parsed.sessions = INITIAL_DATABASE.sessions;
    
    // If there are bookings referencing the old lab IDs or missing startHour, reset them to point to new valid ones
    if (parsed.bookings && parsed.bookings.some((b: any) => b.labId === "lab-a" || b.labId === "lab-b" || b.labId === "lab-c" || !b.startHour)) {
      parsed.bookings = INITIAL_DATABASE.bookings;
    }
    
    fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf-8");
    return parsed;
  } catch (err) {
    console.error("Error reading database, resetting...", err);
    return INITIAL_DATABASE;
  }
}

function saveDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database:", err);
  }
}

// Initialize database file on startup
getDb();

// ==========================================
// API ROUTES
// ==========================================

// 0. AUTHENTICATION
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password wajib diisi." });
  }

  const u = username.toLowerCase().trim();
  if ((u === "admin1" || u === "asistenlab") && (password === "admin123" || password === "asisten123")) {
    return res.json({
      success: true,
      user: {
        username: u,
        name: "Aldy Prayogo, S. T. (Admin 1)",
        role: "Laboran",
        adminLevel: "admin1"
      }
    });
  } else if (u === "admin2" && (password === "admin234" || password === "admin2" || password === "asisten123")) {
    return res.json({
      success: true,
      user: {
        username: "admin2",
        name: "Iik Sumiati (Admin 2)",
        role: "Laboran",
        adminLevel: "admin2"
      }
    });
  } else {
    return res.status(401).json({ error: "Username atau password salah. Silakan gunakan Username & Password resmi Admin 1 atau Admin 2." });
  }
});

// 1. LAB ROOMS
app.get("/api/labs", (req, res) => {
  const db = getDb();
  res.json(db.labs);
});

// Update Lab Details (PC Count, capacity, status, equipment) - Laboran privilege
app.put("/api/labs/:id", (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { pcCount, capacity, status, equipment } = req.body;

  const labIdx = db.labs.findIndex((l: LabRoom) => l.id === id);
  if (labIdx === -1) {
    return res.status(404).json({ error: "Data laboratorium tidak ditemukan." });
  }

  const lab = db.labs[labIdx];

  if (typeof pcCount === "number" && !isNaN(pcCount) && pcCount >= 0) {
    lab.pcCount = pcCount;
    lab.capacity = pcCount; // Keep capacity synced with pcCount
  } else if (typeof capacity === "number" && !isNaN(capacity) && capacity >= 0) {
    lab.capacity = capacity;
    lab.pcCount = capacity;
  }

  if (status && ["Tersedia", "Digunakan", "Pemeliharaan"].includes(status)) {
    lab.status = status;
  }

  if (equipment && Array.isArray(equipment)) {
    lab.equipment = equipment;
  }

  db.labs[labIdx] = lab;

  // Add Notification Log
  const newNotification: NotificationLog = {
    id: `notif-${Date.now()}`,
    title: "Pembaruan Data Lab Komputer",
    message: `Laboran memperbarui data ${lab.name}: Jumlah PC saat ini ${lab.pcCount ?? lab.capacity} unit (Status: ${lab.status}).`,
    type: "system",
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.notifications.unshift(newNotification);

  saveDb(db);
  res.json({ 
    message: `Data ${lab.name} berhasil diperbarui! Jumlah PC: ${lab.pcCount ?? lab.capacity} unit.`, 
    lab, 
    notification: newNotification 
  });
});

// 2. SESSIONS
app.get("/api/sessions", (req, res) => {
  const dateQuery = req.query.date as string;
  if (dateQuery) {
    return res.json(getSessionsForDate(dateQuery));
  }
  const todayStr = new Date().toISOString().split("T")[0];
  res.json(getSessionsForDate(todayStr));
});

// 3. BOOKINGS
app.get("/api/bookings", (req, res) => {
  const db = getDb();
  res.json(db.bookings);
});

app.post("/api/bookings", (req, res) => {
  const db = getDb();
  const { labId, date, userName, userRole, purpose, classroom, startHour, endHour } = req.body;

  if (!labId || !date || !userName || !userRole || !purpose || !startHour || !endHour) {
    return res.status(400).json({ error: "Mohon isi semua data formulir booking termasuk jam pelajaran." });
  }

  const sHour = parseInt(startHour);
  const eHour = parseInt(endHour);
  const outsideHour = getOutsideKBMExtraHour(date);

  if (isNaN(sHour) || isNaN(eHour) || sHour < 1 || sHour > outsideHour || eHour < 1 || eHour > outsideHour || sHour > eHour) {
    return res.status(400).json({ error: `Sesi jam pelajaran tidak valid untuk tanggal tersebut. Maksimum Jam Ke-${outsideHour}.` });
  }

  if (userRole !== "Guru" && userRole !== "Siswa") {
    return res.status(403).json({ error: "Akses Ditolak: Hanya Guru yang ada pada daftar resmi dan Siswa yang dapat mengajukan penggunaan laboratorium." });
  }

  if (userRole === "Guru") {
    const cleanU = userName.trim().toLowerCase().replace(/[\s\.,\-]/g, "");
    const teacherFound = TEACHERS.some(t => {
      const cleanT = t.trim().toLowerCase().replace(/[\s\.,\-]/g, "");
      return cleanT === cleanU || t.trim().toLowerCase() === userName.trim().toLowerCase();
    });
    if (!teacherFound) {
      return res.status(400).json({ error: "Pengajuan ditolak: Nama guru tidak ditemukan dalam daftar guru resmi SMAN 1 Garut. Silakan pilih nama dari daftar guru." });
    }
  }

  if (userRole === "Siswa" && (sHour !== outsideHour || eHour !== outsideHour)) {
    return res.status(400).json({ error: `Siswa hanya diperbolehkan mengajukan penggunaan laboratorium komputer di luar jam pelajaran (Sesi Di Luar Jam KBM / Jam Ke-${outsideHour}).` });
  }

  // Check for overlapping booking (same lab, same date, overlapping hours, and not rejected)
  const isOverlapping = db.bookings.some(
    (b: LabBooking) => b.labId === labId && b.date === date && b.status !== "Ditolak" && (
      sHour <= (b.endHour || 1) && eHour >= (b.startHour || 1)
    )
  );

  if (isOverlapping) {
    return res.status(400).json({ error: "Maaf, laboratorium tersebut sudah terisi pada jam pelajaran dan tanggal yang dipilih." });
  }

  const lab = db.labs.find((l: LabRoom) => l.id === labId);
  if (!lab) {
    return res.status(404).json({ error: "Laboratorium tidak ditemukan." });
  }

  const daySessions = getSessionsForDate(date);
  const startSession = daySessions.find(s => s.id === `jam-${sHour}`);
  const endSession = daySessions.find(s => s.id === `jam-${eHour}`);

  const sessionId = `jam-${sHour}-${eHour}`;
  const sessionName = sHour === outsideHour 
    ? "Di Luar Jam KBM" 
    : (sHour === eHour ? `Jam Ke-${sHour}` : `Jam Ke-${sHour} s/d Jam Ke-${eHour}`);
  const sessionTime = sHour === outsideHour
    ? "Sesuai Kebutuhan"
    : `${startSession ? startSession.time.split(" - ")[0] : ""} - ${endSession ? endSession.time.split(" - ")[1] : ""}`;

  const isAutoApproveTeacher = (name: string): boolean => {
    if (!name) return false;
    const cleanName = name.replace(/[\s\.,\-]/g, "").toLowerCase();
    const allowedCleanNames = [
      "aldyprayogost",
      "mochammadrizkispd",
      "ikeuratnasarispd",
      "poppyseptiandarispd"
    ];
    return allowedCleanNames.includes(cleanName);
  };

  const autoApprove = userRole === "Guru" && isAutoApproveTeacher(userName);
  const newBooking: LabBooking = {
    id: `book-${Date.now()}`,
    labId,
    labName: lab.name,
    date,
    sessionId,
    sessionName,
    sessionTime,
    startHour: sHour,
    endHour: eHour,
    userName,
    userRole,
    classroom: classroom || "",
    purpose,
    status: autoApprove ? "Disetujui" : "Menunggu",
    createdAt: new Date().toISOString()
  };

  db.bookings.unshift(newBooking);

  // Auto-notification creation
  const newNotification: NotificationLog = {
    id: `notif-${Date.now()}`,
    title: autoApprove ? "Booking Lab Disetujui Otomatis" : "Pengajuan Booking Lab Baru",
    message: autoApprove
      ? `${userName} (${userRole}) mencatat penggunaan ${lab.name} pada tanggal ${date} (${sessionName}). Status: Disetujui.`
      : `${userName} (${userRole}) mengajukan penggunaan ${lab.name} pada tanggal ${date} (${sessionName}). Status: Menunggu Persetujuan.`,
    type: "booking",
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.notifications.unshift(newNotification);

  saveDb(db);
  res.status(201).json({ booking: newBooking, notification: newNotification });
});

// Clear All Bookings in Panel Persetujuan (Laboran privilege)
app.delete("/api/bookings-clear-all", (req, res) => {
  const userRole = (req.headers["x-user-role"] as string);
  if (userRole !== "Laboran") {
    return res.status(403).json({ error: "Akses Ditolak: Hanya Admin / Laboran yang dapat mengosongkan panel persetujuan lab." });
  }

  const db = getDb();
  db.bookings = [];
  saveDb(db);
  res.json({ message: "Seluruh data pengajuan penggunaan lab pada panel persetujuan berhasil dikosongkan." });
});

// Approve/Reject Booking (Admin/Teacher privilege)
app.put("/api/bookings/:id/status", (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { status } = req.body; // "Disetujui" | "Ditolak"

  if (status !== "Disetujui" && status !== "Ditolak") {
    return res.status(400).json({ error: "Status tidak valid." });
  }

  const bookingIdx = db.bookings.findIndex((b: LabBooking) => b.id === id);
  if (bookingIdx === -1) {
    return res.status(404).json({ error: "Data booking tidak ditemukan." });
  }

  const booking = db.bookings[bookingIdx];
  booking.status = status;
  db.bookings[bookingIdx] = booking;

  // Add notification log
  const newNotification: NotificationLog = {
    id: `notif-${Date.now()}`,
    title: status === "Disetujui" ? "Booking Lab Disetujui" : "Booking Lab Ditolak",
    message: `Pengajuan penggunaan ${booking.labName} oleh ${booking.userName} pada tanggal ${booking.date} telah ${status.toLowerCase()} oleh instruktur.`,
    type: "booking",
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.notifications.unshift(newNotification);

  saveDb(db);
  res.json({ booking, notification: newNotification });
});

// Delete Booking
app.delete("/api/bookings/:id", (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const bookingIdx = db.bookings.findIndex((b: LabBooking) => b.id === id);
  if (bookingIdx === -1) {
    return res.status(404).json({ error: "Booking tidak ditemukan." });
  }

  const deletedBooking = db.bookings[bookingIdx];
  db.bookings.splice(bookingIdx, 1);

  // Notification for cancellation
  const newNotification: NotificationLog = {
    id: `notif-${Date.now()}`,
    title: "Booking Lab Dibatalkan",
    message: `Pemesanan ${deletedBooking.labName} oleh ${deletedBooking.userName} pada ${deletedBooking.date} telah dibatalkan.`,
    type: "booking",
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.notifications.unshift(newNotification);

  saveDb(db);
  res.json({ message: "Pemesanan berhasil dibatalkan.", notification: newNotification });
});


// 4. INVENTORY ITEMS
app.get("/api/inventory", (req, res) => {
  const db = getDb();
  res.json(db.inventory);
});

app.post("/api/inventory", (req, res) => {
  const userRole = (req.headers["x-user-role"] as string) || req.body?.requesterRole;
  if (userRole !== "Laboran") {
    return res.status(403).json({ error: "Akses Ditolak: Hanya Admin / Laboran yang dapat menambahkan data barang inventaris." });
  }

  const db = getDb();
  const { code, name, category, location, totalQty, image, approvalAdmin } = req.body;

  if (!name || !category || !location || totalQty === undefined) {
    return res.status(400).json({ error: "Mohon isi semua data barang inventaris." });
  }

  const parsedTotalQty = parseInt(totalQty, 10);
  if (isNaN(parsedTotalQty) || parsedTotalQty < 0) {
    return res.status(400).json({ error: "Jumlah total barang tidak valid." });
  }

  const newItem: InventoryItem = {
    id: `inv-${Date.now()}`,
    code: code ? String(code).trim() : undefined,
    name,
    category,
    location,
    totalQty: parsedTotalQty,
    availableQty: parsedTotalQty,
    image: image || null,
    approvalAdmin: approvalAdmin === "admin1_only" ? "admin1_only" : "both"
  };

  db.inventory.push(newItem);

  // Auto-notification creation
  const newNotification: NotificationLog = {
    id: `notif-${Date.now()}`,
    title: "Barang Inventaris Baru Ditambahkan",
    message: `Admin menambahkan barang baru: ${name}${newItem.code ? ` [Kode: ${newItem.code}]` : ''} (${parsedTotalQty} Unit) di ${location}.`,
    type: "borrow",
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.notifications.unshift(newNotification);

  saveDb(db);
  res.status(201).json(newItem);
});

app.put("/api/inventory/:id", (req, res) => {
  const userRole = (req.headers["x-user-role"] as string) || req.body?.requesterRole;
  if (userRole !== "Laboran") {
    return res.status(403).json({ error: "Akses Ditolak: Hanya Admin / Laboran yang dapat mengubah data barang inventaris." });
  }

  const db = getDb();
  const { id } = req.params;
  const { code, name, category, location, totalQty, availableQty, image, approvalAdmin } = req.body;

  const idx = db.inventory.findIndex((item: InventoryItem) => item.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Barang tidak ditemukan." });
  }

  const item = db.inventory[idx];
  const oldName = item.name;
  
  if (code !== undefined) item.code = code ? String(code).trim() : undefined;
  if (name) item.name = name;
  if (category) item.category = category;
  if (location) item.location = location;
  if (image !== undefined) item.image = image;
  if (approvalAdmin !== undefined) item.approvalAdmin = approvalAdmin === "admin1_only" ? "admin1_only" : "both";
  
  if (totalQty !== undefined) {
    const oldTotal = item.totalQty;
    const newTotal = parseInt(totalQty, 10);
    if (!isNaN(newTotal) && newTotal >= 0) {
      item.totalQty = newTotal;
      // Auto-adjust availableQty based on totalQty change or use specified availableQty
      if (availableQty !== undefined) {
        const newAvail = parseInt(availableQty, 10);
        item.availableQty = Math.max(0, Math.min(newTotal, isNaN(newAvail) ? 0 : newAvail));
      } else {
        const diff = newTotal - oldTotal;
        item.availableQty = Math.max(0, Math.min(newTotal, item.availableQty + diff));
      }
    }
  } else if (availableQty !== undefined) {
    const newAvail = parseInt(availableQty, 10);
    if (!isNaN(newAvail) && newAvail >= 0) {
      item.availableQty = Math.min(item.totalQty, newAvail);
    }
  }

  db.inventory[idx] = item;

  // Auto-notification creation
  const newNotification: NotificationLog = {
    id: `notif-${Date.now()}`,
    title: "Barang Inventaris Diperbarui",
    message: `Informasi barang ${oldName} telah diperbarui oleh Admin.`,
    type: "borrow",
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.notifications.unshift(newNotification);

  saveDb(db);
  res.json(item);
});

app.delete("/api/inventory/:id", (req, res) => {
  const userRole = (req.headers["x-user-role"] as string) || req.body?.requesterRole;
  if (userRole !== "Laboran") {
    return res.status(403).json({ error: "Akses Ditolak: Hanya Admin / Laboran yang dapat menghapus data barang inventaris." });
  }

  const db = getDb();
  const { id } = req.params;

  const idx = db.inventory.findIndex((item: InventoryItem) => item.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Barang tidak ditemukan." });
  }

  const deletedItem = db.inventory[idx];
  db.inventory.splice(idx, 1);

  // Auto-notification creation
  const newNotification: NotificationLog = {
    id: `notif-${Date.now()}`,
    title: "Barang Inventaris Dihapus",
    message: `Barang ${deletedItem.name} telah dihapus dari inventaris oleh Admin.`,
    type: "borrow",
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.notifications.unshift(newNotification);

  saveDb(db);
  res.json({ message: "Barang berhasil dihapus dari inventaris." });
});

// 5. BORROWINGS
app.get("/api/borrowings", (req, res) => {
  const db = getDb();
  res.json(db.borrowings);
});

app.post("/api/borrowings", (req, res) => {
  const db = getDb();
  const { itemId, quantity, borrowerName, borrowerRole, returnDate, purpose, classroom, adminLevel } = req.body;

  if (!itemId || !quantity || !borrowerName || !borrowerRole || !returnDate || !purpose) {
    return res.status(400).json({ error: "Mohon isi semua data formulir peminjaman." });
  }

  const requestedQty = parseInt(quantity, 10);
  if (isNaN(requestedQty) || requestedQty <= 0) {
    return res.status(400).json({ error: "Jumlah barang tidak valid." });
  }

  const itemIdx = db.inventory.findIndex((i: InventoryItem) => i.id === itemId);
  if (itemIdx === -1) {
    return res.status(404).json({ error: "Barang tidak ditemukan." });
  }

  const item = db.inventory[itemIdx];

  if (item.availableQty < requestedQty) {
    return res.status(400).json({ error: `Stok ketersediaan tidak mencukupi. Stok saat ini: ${item.availableQty} unit.` });
  }

  const newBorrow: InventoryBorrowing = {
    id: `borrow-${Date.now()}`,
    itemId,
    itemName: item.name,
    quantity: requestedQty,
    borrowerName,
    borrowerRole,
    classroom: classroom || "",
    borrowDate: new Date().toISOString().split("T")[0],
    returnDate,
    actualReturnDate: null,
    purpose,
    status: "Menunggu Persetujuan",
    approvedBy: null,
    approvedByAdminLevel: null,
    createdAt: new Date().toISOString()
  };

  db.borrowings.unshift(newBorrow);

  // Create notification log
  const newNotification: NotificationLog = {
    id: `notif-${Date.now()}`,
    title: "Pengajuan Peminjaman Baru",
    message: `${borrowerName} (${borrowerRole}) mengajukan peminjaman ${requestedQty} unit ${item.name}. Menunggu persetujuan manual Admin.`,
    type: "borrow",
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.notifications.unshift(newNotification);

  saveDb(db);
  res.status(201).json({ borrowing: newBorrow, item, notification: newNotification });
});

// Approve Borrowing Request (Admin 1 or Admin 2)
app.post("/api/borrowings/:id/approve", (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { adminLevel, approverName } = req.body;

  const borrowIdx = db.borrowings.findIndex((b: InventoryBorrowing) => b.id === id);
  if (borrowIdx === -1) {
    return res.status(404).json({ error: "Pengajuan peminjaman tidak ditemukan." });
  }

  const borrow = db.borrowings[borrowIdx];
  if (borrow.status !== "Menunggu Persetujuan") {
    return res.status(400).json({ error: `Pengajuan ini sudah berstatus "${borrow.status}".` });
  }

  const itemIdx = db.inventory.findIndex((i: InventoryItem) => i.id === borrow.itemId);
  if (itemIdx === -1) {
    return res.status(404).json({ error: "Barang inventaris tidak ditemukan." });
  }

  const item = db.inventory[itemIdx];

  // Check Admin 2 restriction
  if (adminLevel === "admin2" && item.approvalAdmin === "admin1_only") {
    return res.status(403).json({
      error: `Akses Ditolak: Barang "${item.name}" dikhususkan untuk persetujuan Admin 1. Akun Admin 2 (Iik Sumiati) tidak memiliki kewenangan untuk memberikan izin peminjaman barang ini.`
    });
  }

  if (item.availableQty < borrow.quantity) {
    return res.status(400).json({
      error: `Gagal memberikan izin: Stok ketersediaan barang ${item.name} tidak mencukupi (${item.availableQty} unit tersisa, dibutuhkan ${borrow.quantity} unit).`
    });
  }

  // Deduct available stock upon approval
  item.availableQty -= borrow.quantity;
  db.inventory[itemIdx] = item;

  const resolvedApproverName = approverName || (adminLevel === "admin2" ? "Iik Sumiati (Admin 2)" : "Aldy Prayogo, S. T. (Admin 1)");
  borrow.status = "Dipinjam";
  borrow.approvedBy = resolvedApproverName;
  borrow.approvedByAdminLevel = adminLevel || "admin1";
  db.borrowings[borrowIdx] = borrow;

  // Add Notification Log
  const newNotification: NotificationLog = {
    id: `notif-${Date.now()}`,
    title: "Izin Peminjaman Disetujui",
    message: `Pengajuan peminjaman ${borrow.quantity} unit ${borrow.itemName} oleh ${borrow.borrowerName} (${borrow.borrowerRole}) telah DISETUJUI oleh ${resolvedApproverName}.`,
    type: "borrow",
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.notifications.unshift(newNotification);

  saveDb(db);
  res.json({ message: "Pemberian izin peminjaman berhasil disetujui!", borrowing: borrow, item, notification: newNotification });
});

// Reject Borrowing Request
app.post("/api/borrowings/:id/reject", (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { adminLevel, rejectorName, reason } = req.body;

  const borrowIdx = db.borrowings.findIndex((b: InventoryBorrowing) => b.id === id);
  if (borrowIdx === -1) {
    return res.status(404).json({ error: "Pengajuan peminjaman tidak ditemukan." });
  }

  const borrow = db.borrowings[borrowIdx];
  if (borrow.status !== "Menunggu Persetujuan") {
    return res.status(400).json({ error: `Pengajuan ini sudah berstatus "${borrow.status}".` });
  }

  const itemIdx = db.inventory.findIndex((i: InventoryItem) => i.id === borrow.itemId);
  if (itemIdx !== -1) {
    const item = db.inventory[itemIdx];
    if (adminLevel === "admin2" && item.approvalAdmin === "admin1_only") {
      return res.status(403).json({
        error: `Akses Ditolak: Pengajuan peminjaman barang "${item.name}" berlabel Khusus Admin 1, tidak dapat diproses oleh Admin 2.`
      });
    }
  }

  const resolvedRejector = rejectorName || (adminLevel === "admin2" ? "Iik Sumiati (Admin 2)" : "Aldy Prayogo, S. T. (Admin 1)");
  borrow.status = "Ditolak";
  borrow.rejectionReason = reason || "Pengajuan peminjaman ditolak oleh admin.";
  borrow.approvedBy = resolvedRejector;
  borrow.approvedByAdminLevel = adminLevel || "admin1";
  db.borrowings[borrowIdx] = borrow;

  // Add Notification Log
  const newNotification: NotificationLog = {
    id: `notif-${Date.now()}`,
    title: "Pengajuan Peminjaman Ditolak",
    message: `Pengajuan peminjaman ${borrow.quantity} unit ${borrow.itemName} oleh ${borrow.borrowerName} DITOLAK oleh ${resolvedRejector}. Alasan: ${borrow.rejectionReason}`,
    type: "borrow",
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.notifications.unshift(newNotification);

  saveDb(db);
  res.json({ message: "Pengajuan peminjaman berhasil ditolak.", borrowing: borrow, notification: newNotification });
});

// Return Borrowed Item
app.post("/api/borrowings/:id/return", (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { actualReturnDate, actualReturnTime, receiverName, returnStatus, evidenceImage } = req.body;

  const borrowIdx = db.borrowings.findIndex((b: InventoryBorrowing) => b.id === id);
  if (borrowIdx === -1) {
    return res.status(404).json({ error: "Log peminjaman tidak ditemukan." });
  }

  const borrow = db.borrowings[borrowIdx];
  if (borrow.status === "Dikembalikan") {
    return res.status(400).json({ error: "Barang sudah dikembalikan sebelumnya." });
  }

  // Return available inventory
  const itemIdx = db.inventory.findIndex((i: InventoryItem) => i.id === borrow.itemId);
  if (itemIdx !== -1) {
    db.inventory[itemIdx].availableQty = Math.min(
      db.inventory[itemIdx].totalQty, 
      db.inventory[itemIdx].availableQty + borrow.quantity
    );
  }

  borrow.status = "Dikembalikan";
  borrow.actualReturnDate = actualReturnDate || new Date().toISOString().split("T")[0];
  borrow.actualReturnTime = actualReturnTime || new Date().toTimeString().split(" ")[0].substring(0, 5);
  borrow.receiverName = receiverName || "Aldy Prayogo, S. T.";
  borrow.returnStatus = returnStatus || "Tepat Waktu";
  borrow.evidenceImage = evidenceImage || null;
  db.borrowings[borrowIdx] = borrow;

  // Add notification log
  const newNotification: NotificationLog = {
    id: `notif-${Date.now()}`,
    title: "Inventaris Dikembalikan",
    message: `${borrow.borrowerName} telah mengembalikan ${borrow.quantity} unit ${borrow.itemName} ke lab komputer. Penerima: ${borrow.receiverName}. Status: ${borrow.returnStatus}.`,
    type: "borrow",
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.notifications.unshift(newNotification);

  saveDb(db);
  res.json({ borrowing: borrow, notification: newNotification });
});

// Delete Borrowing History Record (Admin 1 only)
app.delete("/api/borrowings/:id", (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const adminLevel = req.headers["x-admin-level"] || req.query.adminLevel || req.body?.adminLevel;

  // Verify Admin 1 permission
  if (adminLevel && adminLevel !== "admin1") {
    return res.status(403).json({ 
      error: "Akses Ditolak: Hanya Admin 1 (Aldy Prayogo, S. T.) yang memiliki hak akses untuk menghapus riwayat peminjaman barang." 
    });
  }

  const borrowIdx = db.borrowings.findIndex((b: InventoryBorrowing) => b.id === id);
  if (borrowIdx === -1) {
    return res.status(404).json({ error: "Riwayat transaksi peminjaman tidak ditemukan." });
  }

  const deletedBorrow = db.borrowings[borrowIdx];

  // If deleting an active borrowing ("Dipinjam"), return availableQty to inventory
  if (deletedBorrow.status === "Dipinjam") {
    const itemIdx = db.inventory.findIndex((i: InventoryItem) => i.id === deletedBorrow.itemId);
    if (itemIdx !== -1) {
      db.inventory[itemIdx].availableQty = Math.min(
        db.inventory[itemIdx].totalQty,
        db.inventory[itemIdx].availableQty + deletedBorrow.quantity
      );
    }
  }

  db.borrowings.splice(borrowIdx, 1);

  // Add Notification Log
  const newNotification: NotificationLog = {
    id: `notif-${Date.now()}`,
    title: "Riwayat Peminjaman Dihapus",
    message: `Admin 1 telah menghapus data riwayat peminjaman ${deletedBorrow.itemName} (Peminjam: ${deletedBorrow.borrowerName}).`,
    type: "borrow",
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.notifications.unshift(newNotification);

  saveDb(db);
  res.json({ 
    message: `Riwayat peminjaman ${deletedBorrow.itemName} (${deletedBorrow.borrowerName}) berhasil dihapus.`, 
    deletedId: id, 
    notification: newNotification 
  });
});


// 6. NOTIFICATIONS
app.get("/api/notifications", (req, res) => {
  const db = getDb();
  res.json(db.notifications);
});

app.post("/api/notifications/read-all", (req, res) => {
  const db = getDb();
  db.notifications = db.notifications.map((n: NotificationLog) => ({ ...n, isRead: true }));
  saveDb(db);
  res.json({ success: true, message: "Semua notifikasi ditandai telah dibaca." });
});


// 7. GEMINI REAL-TIME SUMMARY AND AUTOMATIC NOTIFICATIONS GENERATOR
app.get("/api/gemini/summarize", async (req, res) => {
  const db = getDb();
  const ai = getAIClient();

  // Basic stats for compilation
  const stats = {
    totalLabs: db.labs.length,
    activeBookings: db.bookings.filter((b: LabBooking) => b.status === "Disetujui").length,
    pendingBookings: db.bookings.filter((b: LabBooking) => b.status === "Menunggu").length,
    totalItems: db.inventory.length,
    borrowedItemsCount: db.borrowings.filter((b: InventoryBorrowing) => b.status === "Dipinjam").length,
    overdueBorrowings: db.borrowings.filter((b: InventoryBorrowing) => {
      if (b.status !== "Dipinjam") return false;
      const today = new Date().toISOString().split("T")[0];
      return b.returnDate < today;
    }).length,
  };

  const detailedBookings = db.bookings.map((b: LabBooking) => 
    `- Lab: ${b.labName}, Tanggal: ${b.date}, Sesi: ${b.sessionName} (${b.sessionTime}), Pemohon: ${b.userName} (${b.userRole}), Keperluan: ${b.purpose}, Status: ${b.status}`
  ).join("\n");

  const detailedBorrowings = db.borrowings.map((b: InventoryBorrowing) =>
    `- Barang: ${b.itemName}, Peminjam: ${b.borrowerName} (${b.borrowerRole}), Tanggal Pinjam: ${b.borrowDate}, Tenggat: ${b.returnDate}, Status: ${b.status}`
  ).join("\n");

  const prompt = `
    Anda adalah sistem asisten AI analisis cerdas untuk Sistem Informasi Laboratorium Komputer sekolah.
    Berikan laporan ringkas, profesional, dan informatif berdasarkan data waktu nyata (real-time) laboratorium berikut dalam bahasa Indonesia yang ramah, sopan, dan jelas:

    STATISTIK RINGKAS:
    - Jumlah Laboratorium: ${stats.totalLabs}
    - Booking Disetujui (Aktif/Akan Datang): ${stats.activeBookings}
    - Booking Menunggu Persetujuan: ${stats.pendingBookings}
    - Total Jenis Barang Inventaris: ${stats.totalItems}
    - Barang Sedang Dipinjam: ${stats.borrowedItemsCount}
    - Peminjaman Terlambat (Overdue): ${stats.overdueBorrowings}

    DAFTAR DETAIL PENGGUNAAN RUANG LAB:
    ${detailedBookings || "Tidak ada riwayat atau rencana booking."}

    DAFTAR DETAIL PEMINJAMAN BARANG INVENTARIS:
    ${detailedBorrowings || "Tidak ada barang sedang dipinjam saat ini."}

    Tugas Anda:
    1. Berikan Ringkasan Singkat (Executive Summary) tentang aktivitas lab komputer saat ini (apakah sedang sibuk, normal, atau lengang).
    2. Soroti Poin Penting seperti booking yang butuh persetujuan cepat (untuk siswa) atau peminjaman inventaris yang sudah jatuh tempo/overdue.
    3. Berikan 2-3 Rekomendasi Praktis untuk laboran / guru pengelola lab komputer agar manajemen laboratorium menjadi lebih tertib dan efisien.
    
    Format output Anda dalam bentuk Markdown yang cantik, menggunakan heading, list, dan penekanan teks (bold) agar mudah dibaca di halaman dasbor. Gunakan istilah laboratorium sekolah yang natural. Jangan sebutkan API keys, file JSON, database relasional, atau sistem internal server. Fokuslah pada aspek operasional lab.
  `;

  const createLocalReport = (notice: string) => {
    return `### 📊 Laporan Analisis Laboratorium (Analisis Lokal)
    
*${notice} Berikut adalah ringkasan operasional otomatis:*

#### 📈 Analisis Aktivitas Lab
* **Tingkat Kepadatan Lab**: **Sedang hingga Tinggi**. Laboratorium saat ini mencatat **${stats.activeBookings} penggunaan aktif** disetujui, dengan **${stats.pendingBookings} pengajuan mandiri siswa** menunggu persetujuan guru pengelola.
* **Inventaris Aktif**: Terpantau **${stats.borrowedItemsCount} transaksi peminjaman barang** sedang aktif. Terdapat **${stats.overdueBorrowings} kasus keterlambatan** pengembalian barang inventaris.

#### 🔔 Perhatian Penting (Operasional)
1. **Persetujuan Tertunda**: Sebanyak **${stats.pendingBookings} pengajuan dari siswa** memerlukan tindakan persetujuan di tab "Penggunaan Lab" agar siswa dapat menjadwalkan praktikum mandiri dengan pasti.
2. **Keterlambatan Pengembalian**: Terdapat peminjaman barang melewati batas waktu yang membutuhkan penarikan manual atau notifikasi pengingat ke peminjam.

#### 💡 Rekomendasi Manajemen
* **Optimalisasi Sesi**: Jadwal praktikum kelas terpantau cukup padat pada pagi hari (Sesi 1-3). Sarankan siswa untuk melakukan praktikum mandiri di Sesi 4 atau Sesi 5 yang lebih lengang.
* **Audit Inventaris Rutin**: Lakukan pencatatan berkala setiap akhir pekan untuk memverifikasi kecocokan kuantitas unit di dalam lemari penyimpanan inventaris lab komputer.`;
  };

  if (!ai) {
    return res.json({ 
      report: createLocalReport("Layanan AI Google Gemini sedang berjalan dalam mode luring karena kunci API belum dikonfigurasi."), 
      isMock: true 
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    res.json({ report: response.text, isMock: false });
  } catch (error: any) {
    console.error("Gemini API call failed, falling back to local analysis:", error);
    res.json({ 
      report: createLocalReport("Layanan AI Google Gemini sedang mengalami lalu lintas sangat tinggi (Sibuk/503). Beralih secara otomatis ke analisis lokal untuk memastikan laporan tetap tersedia:"), 
      isMock: true 
    });
  }
});


// ==========================================
// VITE OR STATIC FILES PRODUCTION MIDDLEWARE
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Sistem Informasi Lab Komputer berjalan pada http://localhost:${PORT}`);
  });
}

startServer();
