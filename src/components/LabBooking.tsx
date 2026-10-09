import React, { useState } from "react";
import { 
  Building2, 
  Calendar, 
  Clock, 
  User, 
  Check, 
  X, 
  PlusCircle, 
  AlertCircle,
  HelpCircle,
  Clock4,
  Trash2,
  Users,
  ChevronDown,
  Monitor,
  Edit3,
  Save,
  CheckCircle2,
  ShieldCheck
} from "lucide-react";
import { LabRoom, SessionSlot, LabBooking, UserRole } from "../types";
import { TEACHERS } from "../teachers";
import { CLASSROOMS, formatClassroomName } from "../classrooms";
import { 
  getSessionsForDate, 
  getRestTimesForDate, 
  getOutsideKBMExtraHour, 
  getDayLabel,
  getDayOfWeekFromDateString
} from "../utils/scheduleHelper";

interface LabBookingProps {
  labs: LabRoom[];
  sessions: SessionSlot[];
  bookings: LabBooking[];
  onCreateBooking: (bookingData: {
    labId: string;
    date: string;
    startHour: number;
    endHour: number;
    userName: string;
    userRole: UserRole;
    classroom?: string;
    purpose: string;
  }) => Promise<boolean>;
  onUpdateStatus: (bookingId: string, status: "Disetujui" | "Ditolak") => Promise<void>;
  onDeleteBooking: (bookingId: string) => Promise<void>;
  onClearAllBookings?: () => Promise<boolean>;
  onUpdateLab?: (
    labId: string, 
    labData: { pcCount?: number; capacity?: number; status?: "Tersedia" | "Digunakan" | "Pemeliharaan"; equipment?: string[] }
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  asistenUser?: { username: string; name: string; role: string } | null;
  onTriggerLogin?: () => void;
  onLogout?: () => void;
}

export default function LabBookingView({
  labs,
  sessions,
  bookings,
  onCreateBooking,
  onUpdateStatus,
  onDeleteBooking,
  onClearAllBookings,
  onUpdateLab,
  errorMsg,
  setErrorMsg,
  asistenUser,
  onTriggerLogin,
  onLogout
}: LabBookingProps) {
  // Mode selection: "book" or "admin" (simulation role)
  const [activeRole, setActiveRole] = useState<UserRole | "Laboran">("Siswa");

  // Sync active role with logged in status
  React.useEffect(() => {
    if (asistenUser) {
      setActiveRole("Laboran");
    } else if (activeRole === "Laboran") {
      setActiveRole("Siswa");
    }
  }, [asistenUser]);

  const [selectedLabId, setSelectedLabId] = useState<string>(labs[0]?.id || "");
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split("T")[0]);
  
  // Form fields
  const [formLabId, setFormLabId] = useState<string>(labs[0]?.id || "");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [formStartHour, setFormStartHour] = useState<number>(1);
  const [formEndHour, setFormEndHour] = useState<number>(2);

  // Lab PC Edit state
  const [editingLab, setEditingLab] = useState<LabRoom | null>(null);
  const [editPcCount, setEditPcCount] = useState<number>(40);
  const [editStatus, setEditStatus] = useState<"Tersedia" | "Digunakan" | "Pemeliharaan">("Tersedia");
  const [isUpdatingLab, setIsUpdatingLab] = useState<boolean>(false);
  const [labSuccessMsg, setLabSuccessMsg] = useState<string | null>(null);
  const [labErrorMsg, setLabErrorMsg] = useState<string | null>(null);

  const handleOpenEditLab = (lab: LabRoom) => {
    setEditingLab(lab);
    setEditPcCount(lab.pcCount ?? lab.capacity);
    setEditStatus(lab.status);
    setLabErrorMsg(null);
    setLabSuccessMsg(null);
  };

  const handleSaveLabDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLab || !onUpdateLab) return;

    if (isNaN(editPcCount) || editPcCount < 0) {
      setLabErrorMsg("Jumlah PC harus berupa angka positif.");
      return;
    }

    setIsUpdatingLab(true);
    setLabErrorMsg(null);

    const res = await onUpdateLab(editingLab.id, {
      pcCount: editPcCount,
      capacity: editPcCount,
      status: editStatus
    });

    setIsUpdatingLab(false);

    if (res.success) {
      setLabSuccessMsg(res.message || `Jumlah PC ${editingLab.name} berhasil diperbarui menjadi ${editPcCount} unit!`);
      setEditingLab(null);
      setTimeout(() => setLabSuccessMsg(null), 5000);
    } else {
      setLabErrorMsg(res.error || "Gagal memperbarui data lab.");
    }
  };

  // Sync form session hours based on selected activeRole and formDate
  React.useEffect(() => {
    if (activeRole === "Siswa") {
      const outsideHour = getOutsideKBMExtraHour(formDate);
      setFormStartHour(outsideHour);
      setFormEndHour(outsideHour);
    } else {
      setFormStartHour(1);
      setFormEndHour(2);
    }
  }, [activeRole, formDate]);
  const [formUserName, setFormUserName] = useState<string>("");
  const [showTeacherSuggestions, setShowTeacherSuggestions] = useState<boolean>(false);
  const [formClassroom, setFormClassroom] = useState<string>("X-1");
  const [formPurpose, setFormPurpose] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Helper: check if a specific lab session hour is booked
  const getBookingForHour = (labId: string, date: string, hour: number) => {
    return bookings.find(
      b => b.labId === labId && b.date === date && b.status !== "Ditolak" && (
        hour >= (b.startHour || 1) && hour <= (b.endHour || 1)
      )
    );
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (activeRole !== "Guru" && activeRole !== "Siswa") {
      setErrorMsg("Akses ditolak: Hanya Guru yang ada pada daftar resmi dan Siswa yang dapat mengajukan penggunaan laboratorium.");
      return;
    }

    if (!formUserName.trim()) {
      setErrorMsg(activeRole === "Guru" ? "Silakan pilih nama guru dari daftar resmi." : "Nama lengkap siswa wajib diisi.");
      return;
    }

    if (activeRole === "Guru") {
      const cleanInput = formUserName.trim().toLowerCase().replace(/[\s\.,\-]/g, "");
      const isTeacherValid = TEACHERS.some(t => {
        const cleanT = t.trim().toLowerCase().replace(/[\s\.,\-]/g, "");
        return cleanT === cleanInput || t.trim().toLowerCase() === formUserName.trim().toLowerCase();
      });
      if (!isTeacherValid) {
        setErrorMsg("Nama guru tidak valid. Hanya guru yang terdaftar dalam daftar guru resmi SMAN 1 Garut yang dapat mengajukan penggunaan laboratorium.");
        return;
      }
    }

    if (!formPurpose.trim()) {
      setErrorMsg("Tujuan penggunaan wajib diisi.");
      return;
    }
    if (formStartHour > formEndHour) {
      setErrorMsg("Jam pelajaran mulai tidak boleh melebihi jam pelajaran selesai.");
      return;
    }

    const outsideHour = getOutsideKBMExtraHour(formDate);
    if (activeRole === "Siswa" && (formStartHour !== outsideHour || formEndHour !== outsideHour)) {
      setErrorMsg(`Siswa hanya diperbolehkan mengajukan penggunaan laboratorium komputer di luar jam pelajaran (Sesi Di Luar Jam KBM / Jam Ke-${outsideHour}).`);
      return;
    }

    setIsSubmitting(true);
    const success = await onCreateBooking({
      labId: formLabId,
      date: formDate,
      startHour: formStartHour,
      endHour: formEndHour,
      userName: formUserName,
      userRole: activeRole as UserRole, // Role simulation
      classroom: formClassroom,
      purpose: formPurpose
    });

    setIsSubmitting(false);

    if (success) {
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

      if (activeRole === "Guru") {
        if (isAutoApproveTeacher(formUserName)) {
          setSuccessMsg(`Pengajuan penggunaan lab oleh ${formUserName} berhasil disetujui secara otomatis! (Persetujuan Otomatis Guru Utama)`);
        } else {
          setSuccessMsg("Pengajuan penggunaan lab oleh Guru berhasil dikirim! Menunggu persetujuan laboran.");
        }
      } else {
        setSuccessMsg("Pengajuan penggunaan lab oleh Siswa berhasil dikirim! Menunggu persetujuan laboran.");
      }
      setFormUserName("");
      setFormPurpose("");
      setFormClassroom("X-1");
      // Refresh messages
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  const currentSelectedLab = labs.find(l => l.id === selectedLabId);

  return (
    <div className="space-y-6">
      {/* Simulation Persona bar */}
      <div className="bg-slate-800 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-700 text-amber-400 rounded-lg">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Simulasi Peran Pengguna</h4>
            <p className="text-xs text-slate-400">Ganti peran untuk menguji alur pengajuan siswa & persetujuan guru/asisten.</p>
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
              }}
              className={`flex-1 sm:flex-none text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Columns - Timeline Schedule and Rooms */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Labs List / Selection */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Pilih Laboratorium Komputer</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {labs.map(lab => (
                <div
                  key={lab.id}
                  onClick={() => setSelectedLabId(lab.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-32 ${
                    selectedLabId === lab.id
                      ? "border-blue-600 bg-blue-50/10 ring-1 ring-blue-600/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                  id={`lab-selector-${lab.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      lab.status === "Tersedia" 
                        ? "bg-emerald-50 text-emerald-700" 
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {lab.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-1">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{lab.name}</h4>
                      <p className="text-[11px] font-semibold text-blue-700 mt-0.5 flex items-center gap-1">
                        <Monitor className="h-3 w-3 text-blue-600" /> {lab.pcCount ?? lab.capacity} PC Unit
                      </p>
                    </div>
                    {activeRole === "Laboran" && asistenUser && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditLab(lab);
                        }}
                        className="text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded-lg border border-blue-200 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                        title="Ubah Jumlah PC Lab Ini"
                      >
                        <Edit3 className="h-2.5 w-2.5" /> Edit PC
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Schedule Grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">Timeline Jadwal Penggunaan</h3>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wider">
                    {getDayLabel(getDayOfWeekFromDateString(bookingDate))}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Melihat sesi terisi pada tanggal yang dipilih</p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans text-slate-700"
                />
              </div>
            </div>

            {currentSelectedLab && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between">
                  <div className="text-xs text-slate-600 font-semibold truncate">
                    Jadwal untuk: <span className="text-blue-600">{currentSelectedLab.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{bookingDate}</div>
                </div>

                <div className="space-y-2.5">
                  {(() => {
                    const timelineSessions = getSessionsForDate(bookingDate);
                    const dayOfWeek = getDayOfWeekFromDateString(bookingDate);
                    const listItems: Array<{ type: "session"; session: SessionSlot } | { type: "rest"; name: string; time: string }> = [];
                    
                    timelineSessions.forEach(session => {
                      listItems.push({ type: "session", session });
                      
                      const num = parseInt(session.id.replace("jam-", ""));
                      if (dayOfWeek === 1) {
                        if (num === 1) {
                          listItems.push({ type: "rest", name: "Istirahat", time: "07:10 - 07:20" });
                        } else if (num === 5) {
                          listItems.push({ type: "rest", name: "Istirahat", time: "10:00 - 10:10" });
                        } else if (num === 8) {
                          listItems.push({ type: "rest", name: "Istirahat", time: "12:10 - 12:50" });
                        }
                      } else if (dayOfWeek === 5) {
                        if (num === 4) {
                          listItems.push({ type: "rest", name: "Istirahat", time: "09:25 - 09:40" });
                        } else if (num === 6) {
                          listItems.push({ type: "rest", name: "Istirahat & Kegiatan Keagamaan", time: "11:00 - 13:00" });
                        }
                      } else {
                        // Tuesday - Wednesday - Thursday
                        if (num === 4) {
                          listItems.push({ type: "rest", name: "Istirahat", time: "09:30 - 09:45" });
                        } else if (num === 7) {
                          listItems.push({ type: "rest", name: "Istirahat", time: "12:00 - 12:45" });
                        }
                      }
                    });

                    return listItems.map((item, idx) => {
                      if (item.type === "rest") {
                        return (
                          <div 
                            key={`rest-${idx}`}
                            className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 text-slate-400 font-medium"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                                <Clock className="h-4 w-4 text-slate-400" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-500">{item.name} ({item.time})</span>
                                <p className="text-[10px] text-slate-400 mt-0.5">Waktu Jeda / Istirahat KBM</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                              Non-aktif
                            </span>
                          </div>
                        );
                      }

                      const { session } = item;
                      const hourNum = parseInt(session.id.replace("jam-", ""));
                      const booking = getBookingForHour(selectedLabId, bookingDate, hourNum);
                      return (
                        <div
                          key={session.id}
                          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                            booking
                              ? booking.status === "Disetujui"
                                ? "bg-rose-50/10 border-rose-100"
                                : "bg-amber-50/10 border-amber-100"
                              : "bg-emerald-50/10 border-emerald-100"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              booking 
                                ? booking.status === "Disetujui"
                                  ? "bg-rose-50 text-rose-600"
                                  : "bg-amber-50 text-amber-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}>
                              <Clock4 className="h-4 w-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-700">{session.name} ({session.time})</h5>
                              <p className="text-[10px] text-slate-400 mt-0.5">Sesi Jam Pelajaran</p>
                            </div>
                          </div>

                          {booking ? (
                            <div className="flex flex-col sm:items-end text-left sm:text-right">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full self-start sm:self-auto ${
                                booking.status === "Disetujui" 
                                  ? "bg-rose-100 text-rose-700" 
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {booking.status === "Disetujui" ? `Sudah Terisi (${booking.sessionName})` : `Menunggu (${booking.sessionName})`}
                              </span>
                              <p className="text-xs font-semibold text-slate-700 mt-1 line-clamp-1">
                                {booking.userName} ({booking.userRole}) {booking.classroom && <span className="inline-block text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded ml-1 border border-blue-100">{formatClassroomName(booking.classroom)}</span>}
                              </p>
                              <p className="text-[10px] text-slate-400 line-clamp-1">{booking.purpose}</p>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full self-start sm:self-auto">
                              Tersedia (Kosong)
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Booking Request Form / Laboran Mode */}
        <div className="space-y-6">
          {activeRole === "Laboran" ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center text-center space-y-4 animate-fadeIn">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200/70 flex items-center justify-center">
                <ShieldCheck className="h-7 w-7 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Mode Pengelola / Laboran Aktif</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Pengajuan penggunaan laboratorium komputer dikhususkan bagi <strong>Guru yang ada pada daftar resmi</strong> dan <strong>Siswa</strong>.
                </p>
              </div>

              <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 text-left text-xs text-slate-600 space-y-2.5">
                <div className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" /> Tugas & Wewenang Laboran:
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  • Meninjau, menyetujui, atau menolak permohonan pada <strong>Panel Persetujuan Penggunaan Lab</strong> di bawah.
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  • Mengosongkan data panel persetujuan bila diperlukan.
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  • Mengatur kapasitas dan jumlah unit PC aktif per ruangan lab.
                </p>
              </div>

              <div className="w-full pt-1">
                <p className="text-[11px] text-slate-400 mb-2">Uji coba pengajuan penggunaan lab:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRole("Guru");
                      setFormUserName(TEACHERS[0]);
                    }}
                    className="text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2.5 px-3 rounded-xl border border-indigo-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Users className="h-3.5 w-3.5" /> Ajukan sbg Guru
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRole("Siswa");
                      setFormUserName("");
                    }}
                    className="text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 px-3 rounded-xl border border-blue-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <User className="h-3.5 w-3.5" /> Ajukan sbg Siswa
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Form Pengajuan Booking {activeRole === "Guru" ? "(Guru Terdaftar)" : "(Siswa)"}
                </h3>
              </div>

              <form onSubmit={handleBookingSubmit} className="space-y-4 flex-1">
                {/* Error & Success Messages */}
                {errorMsg && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs flex items-start gap-2 border border-red-100 animate-fadeIn">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs flex items-start gap-2 border border-emerald-100 animate-fadeIn">
                    <Check className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Informational student banner */}
                {activeRole === "Siswa" && (
                  <div className="bg-blue-50 text-blue-800 p-3.5 rounded-xl text-[11px] leading-relaxed border border-blue-100 flex items-start gap-2.5 animate-fadeIn">
                    <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-blue-900 block mb-0.5">ℹ️ Pengajuan Mandiri Siswa:</span>
                      Siswa diperbolehkan mengajukan penggunaan labkom mandiri <strong>hanya di luar jam pelajaran</strong> (Sesi Di Luar Jam KBM). Pengajuan ini memerlukan persetujuan dari Guru atau Laboran sebelum laboratorium dapat digunakan.
                    </div>
                  </div>
                )}

                {/* Informational teacher banner */}
                {activeRole === "Guru" && (
                  <div className="bg-indigo-50 text-indigo-800 p-3.5 rounded-xl text-[11px] leading-relaxed border border-indigo-100 flex items-start gap-2.5 animate-fadeIn">
                    <AlertCircle className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-indigo-900 block mb-0.5">ℹ️ Pengajuan Guru Resmi SMAN 1 Garut:</span>
                      Hanya nama guru yang tercantum dalam daftar guru resmi SMAN 1 Garut yang dapat mengajukan penggunaan laboratorium komputer ({TEACHERS.length} Guru Terdaftar).
                    </div>
                  </div>
                )}

                {/* Lab Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Laboratorium</label>
                  <select
                    value={formLabId}
                    onChange={(e) => setFormLabId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-sans font-medium"
                  >
                    {labs.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Tanggal Penggunaan</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-sans font-medium"
                  />
                </div>

                {/* Session Selector - From Lesson Hour to Lesson Hour */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Mulai Jam Ke-</label>
                    <select
                      value={formStartHour}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setFormStartHour(val);
                        if (formEndHour < val) {
                          setFormEndHour(val);
                        }
                      }}
                      className={`w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-sans font-medium ${
                        activeRole === "Siswa" ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-white"
                      }`}
                      disabled={activeRole === "Siswa"}
                    >
                      {getSessionsForDate(formDate).map(s => {
                        const num = parseInt(s.id.replace("jam-", ""));
                        return <option key={s.id} value={num}>{s.name}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Sampai Jam Ke-</label>
                    <select
                      value={formEndHour}
                      onChange={(e) => setFormEndHour(parseInt(e.target.value))}
                      className={`w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-sans font-medium ${
                        activeRole === "Siswa" ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-white"
                      }`}
                      disabled={activeRole === "Siswa"}
                    >
                      {getSessionsForDate(formDate).map(s => {
                        const num = parseInt(s.id.replace("jam-", ""));
                        return <option key={s.id} value={num} disabled={num < formStartHour}>{s.name}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {/* Requestor Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-500">
                      Nama Pemohon {activeRole === "Guru" ? "(Wajib Guru Terdaftar)" : "(Siswa)"}
                    </label>
                    {activeRole === "Guru" && (
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        {TEACHERS.length} Guru Terdaftar
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={formUserName}
                      onChange={(e) => {
                        setFormUserName(e.target.value);
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
                      placeholder={activeRole === "Guru" ? "Ketik nama atau pilih guru dari daftar..." : "Contoh: Rian Prasetya"}
                      className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-14 p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-sans font-medium"
                    />
                    <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
                      {formUserName && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormUserName("");
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
                          const isExactMatch = TEACHERS.some(t => t === formUserName);
                          const filtered = (isExactMatch || !formUserName.trim())
                            ? TEACHERS
                            : TEACHERS.filter(t => t.toLowerCase().includes(formUserName.toLowerCase()));

                          if (filtered.length === 0) {
                            return <div className="p-2.5 text-xs text-slate-400 italic">Guru tidak ditemukan dalam daftar</div>;
                          }

                          return filtered.map((teacher) => (
                            <button
                              key={teacher}
                              type="button"
                              onMouseDown={() => {
                                setFormUserName(teacher);
                                setShowTeacherSuggestions(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 font-medium transition-colors flex items-center justify-between ${
                                formUserName === teacher ? "bg-blue-50/70 text-blue-700 font-bold" : ""
                              }`}
                            >
                              <span>{teacher}</span>
                              {formUserName === teacher && (
                                <span className="text-[10px] text-blue-600 font-semibold bg-blue-100 px-1.5 py-0.5 rounded">Terpilih</span>
                              )}
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>

                  {activeRole === "Guru" && formUserName && (
                    <div className="mt-1.5">
                      {TEACHERS.some(t => 
                        t.toLowerCase().trim() === formUserName.trim().toLowerCase() ||
                        t.replace(/[\s\.,\-]/g, "").toLowerCase() === formUserName.replace(/[\s\.,\-]/g, "").toLowerCase()
                      ) ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold">
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Guru Terdaftar: {formUserName}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-medium">
                          <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                          Nama belum cocok dengan daftar resmi. Silakan pilih nama dari daftar di atas.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Kelas Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Kelas Pemakai / Sasaran</label>
                  <select
                    value={formClassroom}
                    onChange={(e) => setFormClassroom(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-sans font-medium"
                    id="booking-classroom-selector"
                  >
                    {CLASSROOMS.map(cls => (
                      <option key={cls} value={cls}>{formatClassroomName(cls)}</option>
                    ))}
                  </select>
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Keperluan / Tujuan</label>
                  <textarea
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    placeholder={activeRole === "Siswa" ? "Contoh: Tugas mandiri pemrograman Python / belajar kelompok" : "Contoh: Pembelajaran Pemrograman Dasar XI-RPL"}
                    rows={3}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-sans resize-none font-medium"
                  />
                </div>

                {/* Simulated notification label */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-600 block mb-0.5">ℹ️ Catatan Sistem Notifikasi:</span>
                  Setiap pemesanan akan otomatis membuat log notifikasi real-time yang dapat dibaca di Dasbor & Pusat Notifikasi.
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-3 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSubmitting 
                    ? "Memproses..." 
                    : `Kirim Pengajuan ${activeRole} (Menunggu Persetujuan)`}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Admin Control/Persetujuan Panel & PC Management (Visible for logged in Laboran) */}
      {activeRole === "Laboran" && asistenUser && (
        <div className="space-y-6">
          {/* Section Management PC Count Per Lab */}
          <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs animate-fadeIn" id="lab-pc-management-panel">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-blue-100">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Manajemen & Pembaruan Data Jumlah PC Setiap Lab Komputer</h3>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                Menu Laboran
              </span>
            </div>

            {labSuccessMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="font-semibold">{labSuccessMsg}</span>
              </div>
            )}

            {labErrorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span className="font-semibold">{labErrorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {labs.map(lab => (
                <div key={lab.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-slate-800">{lab.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        lab.status === "Tersedia"
                          ? "bg-emerald-100 text-emerald-800"
                          : lab.status === "Pemeliharaan"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                      }`}>
                        {lab.status}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200/80 my-2 text-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Jumlah PC Unit</span>
                      <span className="text-2xl font-black text-blue-600 font-mono">{lab.pcCount ?? lab.capacity}</span>
                      <span className="text-xs text-slate-500 font-medium ml-1">PC</span>
                    </div>

                    {lab.equipment && lab.equipment.length > 0 && (
                      <p className="text-[10px] text-slate-400 line-clamp-2 italic mb-3">
                        {lab.equipment.join(" • ")}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEditLab(lab)}
                    className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Ubah Jumlah PC
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Table Panel Persetujuan Booking */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs animate-fadeIn" id="admin-approvals-panel">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-800">Panel Persetujuan Penggunaan Lab (Pengelola)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {bookings.length} Pengajuan
                </span>
              </div>
              {asistenUser && bookings.length > 0 && onClearAllBookings && (
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm("Apakah Anda yakin ingin mengosongkan seluruh data pengajuan pada Panel Persetujuan Penggunaan Lab?")) {
                      await onClearAllBookings();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-all cursor-pointer"
                  title="Kosongkan seluruh data pengajuan pada panel persetujuan"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Kosongkan Panel Persetujuan
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400">
                    <th className="py-2.5">Pemohon</th>
                    <th className="py-2.5">Laboratorium</th>
                    <th className="py-2.5">Jadwal Sesi</th>
                    <th className="py-2.5">Keperluan</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                            <Check className="h-5 w-5 text-slate-400" />
                          </div>
                          <p className="font-bold text-slate-700 text-xs">Panel Persetujuan Bersih (Kosong)</p>
                          <p className="text-[11px] text-slate-400 max-w-sm">
                            Tidak ada pengajuan penggunaan lab saat ini. Pengajuan baru dari guru terdaftar dan siswa akan muncul di panel ini untuk ditinjau.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    bookings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/40">
                        <td className="py-3 font-semibold text-slate-700">
                          {b.userName}
                          <span className="block text-[10px] text-slate-400 font-medium">
                            {b.userRole}{b.classroom ? ` • ${formatClassroomName(b.classroom)}` : ""}
                          </span>
                        </td>
                        <td className="py-3 text-slate-600 font-medium">{b.labName}</td>
                        <td className="py-3">
                          <div className="text-slate-700 font-semibold">{b.date}</div>
                          <div className="text-[10px] text-blue-600 font-medium">{b.sessionName} ({b.sessionTime})</div>
                        </td>
                        <td className="py-3 text-slate-500 max-w-xs truncate" title={b.purpose}>{b.purpose}</td>
                        <td className="py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            b.status === "Disetujui" 
                              ? "bg-emerald-100 text-emerald-700" 
                              : b.status === "Ditolak" 
                                ? "bg-rose-100 text-rose-700" 
                                : "bg-amber-100 text-amber-700"
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {b.status === "Menunggu" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onUpdateStatus(b.id, "Disetujui")}
                                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"
                                title="Setujui"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => onUpdateStatus(b.id, "Ditolak")}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all"
                                title="Tolak"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => onDeleteBooking(b.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Batalkan Booking"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Edit Jumlah PC */}
      {editingLab && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 relative">
            <button
              type="button"
              onClick={() => setEditingLab(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Monitor className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-800">Ubah Data Jumlah PC {editingLab.name}</h3>
            </div>

            <form onSubmit={handleSaveLabDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Jumlah PC Unit Tersedia
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={editPcCount}
                    onChange={(e) => setEditPcCount(parseInt(e.target.value) || 0)}
                    className="w-full text-sm font-extrabold border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                    required
                  />
                  <span className="absolute right-3 top-3.5 text-xs text-slate-400 font-bold">Unit PC</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mencatat total unit PC yang aktif dan dapat digunakan untuk praktikum di {editingLab.name}.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Status Operasional Ruangan
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
                >
                  <option value="Tersedia">Tersedia (Siap Digunakan)</option>
                  <option value="Pemeliharaan">Pemeliharaan (Maintenance / Perbaikan)</option>
                  <option value="Digunakan">Digunakan (Sedang Digunakan Sesi Khusus)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingLab(null)}
                  className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingLab}
                  className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {isUpdatingLab ? "Memproses..." : "Simpan Perubahan PC"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
