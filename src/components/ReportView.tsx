import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { 
  FileText, 
  Sparkles, 
  Printer, 
  Filter, 
  Search, 
  Calendar, 
  Building2, 
  Laptop, 
  Cpu, 
  RefreshCw,
  Clock,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  Download
} from "lucide-react";
import { LabBooking, InventoryBorrowing } from "../types";
import { formatClassroomName } from "../classrooms";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportViewProps {
  bookings: LabBooking[];
  borrowings: InventoryBorrowing[];
  onFetchAiSummary: () => Promise<{ report: string; isMock: boolean }>;
  asistenUser?: { username: string; name: string; role: string } | null;
  onTriggerLogin?: () => void;
}

export default function ReportView({
  bookings,
  borrowings,
  onFetchAiSummary,
  asistenUser,
  onTriggerLogin
}: ReportViewProps) {
  // Tabs: "booking" or "borrow" reports
  const [activeReportTab, setActiveReportTab] = useState<"booking" | "borrow">("booking");
  
  // Filters
  const [roleFilter, setRoleFilter] = useState<string>("Semua");
  const [statusFilter, setStatusFilter] = useState<string>("Semua");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  // Period states: harian, bulanan, tahunan, semua (kustom)
  const [periodType, setPeriodType] = useState<"semua" | "harian" | "bulanan" | "tahunan">("semua");
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedMonthlyDate, setSelectedMonthlyDate] = useState<string>(new Date().toISOString().slice(0, 7)); // e.g., "2026-07"
  const [selectedYearlyDate, setSelectedYearlyDate] = useState<string>(new Date().getFullYear().toString()); // e.g., "2026"

  const getReadablePeriod = () => {
    if (periodType === "harian") {
      if (!selectedDailyDate) return "Harian";
      const dateObj = new Date(selectedDailyDate);
      return `Harian (${dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })})`;
    }
    if (periodType === "bulanan") {
      if (!selectedMonthlyDate) return "Bulanan";
      const [year, month] = selectedMonthlyDate.split("-");
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      return `Bulanan (${dateObj.toLocaleDateString("id-ID", { month: "long", year: "numeric" })})`;
    }
    if (periodType === "tahunan") {
      return `Tahunan (${selectedYearlyDate})`;
    }
    if (startDate || endDate) {
      const startStr = startDate ? new Date(startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Awal";
      const endStr = endDate ? new Date(endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Kini";
      return `Rentang (${startStr} - ${endStr})`;
    }
    return "Semua Waktu";
  };

  // AI Summary States
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [isMockAi, setIsMockAi] = useState<boolean>(false);

  const handleGenerateAiReport = async () => {
    setIsLoadingAi(true);
    try {
      const data = await onFetchAiSummary();
      setAiReport(data.report);
      setIsMockAi(data.isMock);
    } catch (err) {
      console.error("Gagal mendapatkan analisis AI", err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handlePrint = () => {
    if (!asistenUser) return;
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!asistenUser) return;
    
    const doc = new jsPDF();
    
    // Header Style
    doc.setFillColor(15, 23, 42); // slate-900 background for top banner
    doc.rect(0, 0, 210, 35, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("LAPORAN AKTIVITAS LABORATORIUM KOMPUTER", 15, 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text("SILAB-KOM: Sistem Informasi Laboratorium Komputer Mandiri", 15, 22);
    doc.text(`Dicetak Oleh: ${asistenUser.name} (Laboran)  |  Tanggal: ${new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}`, 15, 28);
    
    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    
    let currentY = 45;
    
    // Document Title
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    const reportTitle = activeReportTab === "booking" 
      ? "Laporan Riwayat Penggunaan Ruang Laboratorium Komputer" 
      : "Laporan Riwayat Peminjaman Inventaris Barang";
    doc.text(reportTitle, 15, currentY);
    currentY += 6;
    
    // Filters metadata
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    const filterText = `Kriteria filter: Peran: ${roleFilter} | Status: ${statusFilter} | Periode: ${getReadablePeriod()}` + 
      (searchTerm ? ` | Kata Kunci: "${searchTerm}"` : '');
    doc.text(filterText, 15, currentY);
    currentY += 12;
    
    // Dynamic Table content
    if (activeReportTab === "booking") {
      const headers = [["No", "Pemohon", "Peran", "Lab", "Tanggal", "Sesi / Jam", "Tujuan", "Status"]];
      const rows = filteredBookings.map((b, index) => [
        (index + 1).toString(),
        b.userName,
        b.userRole,
        b.labName,
        b.date,
        `${b.sessionName}\n(${b.sessionTime})`,
        b.purpose,
        b.status
      ]);
      
      autoTable(doc, {
        startY: currentY,
        head: headers,
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 25 },
          2: { cellWidth: 18 },
          3: { cellWidth: 25 },
          4: { cellWidth: 22 },
          5: { cellWidth: 32 },
          6: { cellWidth: 43 },
          7: { cellWidth: 20 }
        },
        styles: { overflow: 'linebreak', cellPadding: 3 },
        margin: { left: 15, right: 15 }
      });
    } else {
      const headers = [["No", "Barang Inventaris", "Jml", "Peminjam", "Peran", "Tgl Pinjam", "Batas Kembali", "Keperluan", "Status"]];
      const rows = filteredBorrowings.map((b, index) => [
        (index + 1).toString(),
        b.itemName,
        b.quantity.toString(),
        b.borrowerName,
        b.borrowerRole,
        b.borrowDate,
        b.returnDate + (b.actualReturnDate ? `\n(Kembali: ${b.actualReturnDate})` : ''),
        b.purpose,
        b.status
      ]);
      
      autoTable(doc, {
        startY: currentY,
        head: headers,
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 30 },
          2: { cellWidth: 12 },
          3: { cellWidth: 25 },
          4: { cellWidth: 15 },
          5: { cellWidth: 22 },
          6: { cellWidth: 28 },
          7: { cellWidth: 43 },
          8: { cellWidth: 20 }
        },
        styles: { overflow: 'linebreak', cellPadding: 3 },
        margin: { left: 15, right: 15 }
      });
    }
    
    // Add Signature Section at the bottom of the table
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    // Check if we need to add a new page for signatures to prevent clipping
    const pageHeight = doc.internal.pageSize.height;
    let sigY = finalY;
    if (finalY + 40 > pageHeight) {
      doc.addPage();
      sigY = 25;
    }
    
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    
    // Single signature on the right side
    const rightColX = 125;
    doc.setFont("helvetica", "normal");
    doc.text(`Bandung, ${new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}`, rightColX, sigY);
    doc.text("Mengetahui,", rightColX, sigY + 5);
    doc.setFont("helvetica", "bold");
    doc.text("Kepala Laboratorium Komputer", rightColX, sigY + 10);
    
    doc.setFont("helvetica", "bold");
    doc.text("Aldy Prayogo, S. T.", rightColX, sigY + 30);
    doc.setFont("helvetica", "normal");
    doc.text("NIP. 199005132022211013", rightColX, sigY + 35);
    
    // Save PDF
    const filename = activeReportTab === "booking" 
      ? `laporan_penggunaan_lab_${new Date().toISOString().split('T')[0]}.pdf` 
      : `laporan_peminjaman_inventaris_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  // Filter Bookings
  const filteredBookings = bookings.filter(b => {
    const matchesRole = roleFilter === "Semua" || b.userRole === roleFilter;
    const matchesStatus = statusFilter === "Semua" || b.status === statusFilter;
    const matchesSearch = 
      b.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.labName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (periodType === "harian") {
      matchesDate = b.date === selectedDailyDate;
    } else if (periodType === "bulanan") {
      matchesDate = b.date.startsWith(selectedMonthlyDate);
    } else if (periodType === "tahunan") {
      matchesDate = b.date.startsWith(selectedYearlyDate);
    } else {
      matchesDate = 
        (!startDate || b.date >= startDate) && 
        (!endDate || b.date <= endDate);
    }
    return matchesRole && matchesStatus && matchesSearch && matchesDate;
  });

  // Filter Borrowings
  const filteredBorrowings = borrowings.filter(b => {
    const matchesRole = roleFilter === "Semua" || b.borrowerRole === roleFilter;
    const matchesStatus = statusFilter === "Semua" || b.status === statusFilter;
    const matchesSearch = 
      b.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (periodType === "harian") {
      matchesDate = b.borrowDate === selectedDailyDate;
    } else if (periodType === "bulanan") {
      matchesDate = b.borrowDate.startsWith(selectedMonthlyDate);
    } else if (periodType === "tahunan") {
      matchesDate = b.borrowDate.startsWith(selectedYearlyDate);
    } else {
      matchesDate = 
        (!startDate || b.borrowDate >= startDate) && 
        (!endDate || b.borrowDate <= endDate);
    }
    return matchesRole && matchesStatus && matchesSearch && matchesDate;
  });

  // CSV Export
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    
    if (activeReportTab === "booking") {
      headers = ["No", "Pemohon", "Peran", "Laboratorium", "Tanggal", "Sesi", "Jam Sesi", "Tujuan", "Status"];
      rows = filteredBookings.map((b, index) => [
        (index + 1).toString(),
        b.userName,
        b.userRole,
        b.labName,
        b.date,
        b.sessionName,
        b.sessionTime,
        b.purpose,
        b.status
      ]);
    } else {
      headers = ["No", "Barang Inventaris", "Jumlah", "Peminjam", "Peran", "Tanggal Pinjam", "Batas Kembali", "Tanggal Dikembalikan", "Tujuan Pemakaian", "Status"];
      rows = filteredBorrowings.map((b, index) => [
        (index + 1).toString(),
        b.itemName,
        `${b.quantity} Unit`,
        b.borrowerName,
        b.borrowerRole,
        b.borrowDate,
        b.returnDate,
        b.actualReturnDate || "-",
        b.purpose,
        b.status
      ]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filename = activeReportTab === "booking" ? "laporan_penggunaan_lab.csv" : "laporan_peminjaman_inventaris.csv";
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* AI Assistant Section */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 text-white p-6 rounded-3xl border border-blue-950 shadow-md relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 top-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30">
              <Sparkles className="h-3 w-3" /> Rekomendasi Cerdas AI
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white">Analisis Laporan Laboratorium Cerdas</h2>
            <p className="text-xs text-blue-200 max-w-2xl leading-relaxed">
              Minta asisten virtual Gemini AI untuk menyusun laporan eksekutif operasional lab komputer saat ini, mengidentifikasi pola kepadatan penggunaan, menganalisis stok inventaris, serta memberikan rekomendasi otomatis.
            </p>
          </div>
          
          <button
            onClick={handleGenerateAiReport}
            disabled={isLoadingAi}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {isLoadingAi ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Menganalisis...
              </>
            ) : (
              <>
                <Cpu className="h-4 w-4" /> Mulai Analisis AI
              </>
            )}
          </button>
        </div>

        {/* AI report output display */}
        {aiReport && (
          <div className="mt-6 p-5 bg-white/5 border border-white/10 rounded-2xl animate-fadeIn prose prose-invert max-w-none text-xs leading-relaxed text-slate-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-300 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-blue-400" /> Hasil Analisis Asisten Gemini
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {isMockAi ? "Mode Lokal (Offline)" : "Koneksi Langsung Gemini-3.5-Flash"}
              </span>
            </div>
            <div className="markdown-body">
              <ReactMarkdown>{aiReport}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* Main printable report section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:shadow-none print:border-none">
        
        {/* Print Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4 mb-5 print:border-b-2 print:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-50 rounded-xl text-slate-700 print:hidden">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 print:text-lg">
                Laporan Aktivitas Laboratorium Komputer
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 print:text-slate-600 print:text-[11px]">
                Dokumen kompilasi riwayat penggunaan ruang dan peminjaman inventaris real-time.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            {asistenUser ? (
              <>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-4 py-2.5 rounded-lg border border-emerald-200 transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" /> Ekspor CSV
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-4 py-2.5 rounded-lg border border-blue-200 transition-all cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" /> Unduh Laporan PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-lg border border-slate-200 transition-all cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Cetak (Browser)
                </button>
              </>
            ) : (
              <button
                onClick={onTriggerLogin}
                className="flex items-center justify-center gap-2 bg-slate-100 text-slate-400 font-semibold text-xs px-4 py-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-200 hover:text-slate-600 transition-colors"
                title="Harus login sebagai Laboran untuk mengunduh laporan"
              >
                <Download className="h-3.5 w-3.5" /> Unduh Terkunci (Login Laboran)
              </button>
            )}
          </div>
        </div>

        {/* Access Warning Card if not logged in */}
        {!asistenUser && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-800">Akses Terbatas: Unduh PDF & Ekspor Laporan</h4>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  Data laporan komprehensif penggunaan laboratorium dan peminjaman inventaris hanya dapat diunduh dalam format PDF atau diekspor ke CSV oleh **Laboran** demi kepatuhan & integritas data operasional.
                </p>
              </div>
            </div>
            <button
              onClick={onTriggerLogin}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              Masuk sebagai Laboran
            </button>
          </div>
        )}

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 mb-5 print:hidden">
          <button
            onClick={() => {
              setActiveReportTab("booking");
              setRoleFilter("Semua");
              setStatusFilter("Semua");
            }}
            className={`text-xs font-bold px-4 py-3 border-b-2 transition-all ${
              activeReportTab === "booking"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Riwayat Pemakaian Lab Ruangan
          </button>
          <button
            onClick={() => {
              setActiveReportTab("borrow");
              setRoleFilter("Semua");
              setStatusFilter("Semua");
            }}
            className={`text-xs font-bold px-4 py-3 border-b-2 transition-all ${
              activeReportTab === "borrow"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Riwayat Peminjaman Inventaris
          </button>
        </div>

        {/* Dynamic Summary Cards Grid (Real-time Report Analysis) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {(() => {
            const approvedBookings = filteredBookings.filter(b => b.status === "Disetujui");
            const totalApprovedSessions = approvedBookings.length;
            const totalDurationMinutes = totalApprovedSessions * 90; // Each slot is roughly 90 mins
            const totalDurationHoursStr = `${Math.floor(totalDurationMinutes / 60)} Jam ${totalDurationMinutes % 60} Menit`;
            
            // Find most active lab based on bookings
            const labCounts: Record<string, number> = {};
            approvedBookings.forEach(b => {
              labCounts[b.labName] = (labCounts[b.labName] || 0) + 1;
            });
            let mostActiveLabName = "-";
            let maxLabCount = 0;
            Object.entries(labCounts).forEach(([name, count]) => {
              if (count > maxLabCount) {
                maxLabCount = count;
                mostActiveLabName = name;
              }
            });

            const todayDateStr = new Date().toISOString().split("T")[0];
            const totalBorrowedQty = filteredBorrowings
              .filter(b => b.status === "Dipinjam")
              .reduce((sum, b) => sum + b.quantity, 0);
            const totalReturnedQty = filteredBorrowings
              .filter(b => b.status === "Dikembalikan")
              .reduce((sum, b) => sum + b.quantity, 0);
            const totalOverdueQty = filteredBorrowings
              .filter(b => b.status === "Dipinjam" && b.returnDate < todayDateStr)
              .reduce((sum, b) => sum + b.quantity, 0);

            if (activeReportTab === "booking") {
              return (
                <>
                  {/* Total Pemakaian Card */}
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3 shadow-xs">
                    <div className="p-3 bg-blue-500 text-white rounded-xl">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Frekuensi Penggunaan</p>
                      <p className="text-base font-bold text-slate-800">{totalApprovedSessions} Sesi Disetujui</p>
                    </div>
                  </div>

                  {/* Total Durasi Card */}
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3 shadow-xs">
                    <div className="p-3 bg-emerald-500 text-white rounded-xl">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Durasi Pemakaian</p>
                      <p className="text-base font-bold text-slate-800">{totalDurationHoursStr}</p>
                    </div>
                  </div>

                  {/* Teraktif Card */}
                  <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 flex items-center gap-3 shadow-xs">
                    <div className="p-3 bg-purple-500 text-white rounded-xl">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lab Teraktif Saat Ini</p>
                      <p className="text-base font-bold text-slate-800 truncate max-w-[180px]">{mostActiveLabName} ({maxLabCount}x)</p>
                    </div>
                  </div>
                </>
              );
            } else {
              return (
                <>
                  {/* Sedang Dipinjam Card */}
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3 shadow-xs">
                    <div className="p-3 bg-blue-500 text-white rounded-xl">
                      <ArrowLeftRight className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sedang Dipinjam</p>
                      <p className="text-base font-bold text-slate-800">{totalBorrowedQty} Unit Barang</p>
                    </div>
                  </div>

                  {/* Sudah Kembali Card */}
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3 shadow-xs">
                    <div className="p-3 bg-emerald-500 text-white rounded-xl">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sudah Kembali</p>
                      <p className="text-base font-bold text-slate-800">{totalReturnedQty} Unit Barang</p>
                    </div>
                  </div>

                  {/* Terlambat Card */}
                  <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 flex items-center gap-3 shadow-xs">
                    <div className="p-3 bg-rose-500 text-white rounded-xl">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peminjaman Terlambat (Overdue)</p>
                      <p className="text-base font-bold text-rose-700">{totalOverdueQty} Unit Overdue</p>
                    </div>
                  </div>
                </>
              );
            }
          })()}
        </div>

        {/* Period selection segment */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Periode Laporan:</span>
            <div className="inline-flex p-1 bg-slate-200/80 rounded-lg">
              {(["semua", "harian", "bulanan", "tahunan"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setPeriodType(type)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    periodType === type
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {type === "semua" ? "Kustom / Semua" : type === "harian" ? "Harian" : type === "bulanan" ? "Bulanan" : "Tahunan"}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Input based on periodType */}
          <div className="flex items-center gap-3 shrink-0">
            {periodType === "harian" && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Pilih Hari:</span>
                <input
                  type="date"
                  value={selectedDailyDate}
                  onChange={(e) => setSelectedDailyDate(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-mono shadow-3xs"
                />
              </div>
            )}
            
            {periodType === "bulanan" && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Pilih Bulan:</span>
                <input
                  type="month"
                  value={selectedMonthlyDate}
                  onChange={(e) => setSelectedMonthlyDate(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-mono shadow-3xs"
                />
              </div>
            )}

            {periodType === "tahunan" && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Pilih Tahun:</span>
                <select
                  value={selectedYearlyDate}
                  onChange={(e) => setSelectedYearlyDate(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 shadow-3xs animate-fadeIn"
                >
                  {["2026", "2025", "2024", "2023"].map((yr) => (
                    <option key={yr} value={yr}>Tahun {yr}</option>
                  ))}
                </select>
              </div>
            )}

            {periodType === "semua" && (
              <span className="text-[10px] text-slate-400 font-semibold italic">Rentang waktu diatur lewat filter di bawah</span>
            )}
          </div>
        </div>

        {/* Filter controls panel */}
        <div className={`grid grid-cols-1 ${periodType === "semua" ? "md:grid-cols-5" : "md:grid-cols-3"} gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200 mb-5 print:hidden`}>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kata kunci..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg pl-8 pr-3 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700"
            />
          </div>

          {periodType === "semua" && (
            <>
              {/* Date Filter: Start */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Dari:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-mono"
                />
              </div>

              {/* Date Filter: End */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 font-sans">S/D:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-mono"
                />
              </div>
            </>
          )}

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Peran:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-sans"
            >
              <option value="Semua">Semua Peran</option>
              <option value="Siswa">Siswa</option>
              <option value="Guru">Guru</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-sans"
            >
              <option value="Semua">Semua Status</option>
              {activeReportTab === "booking" ? (
                <>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Menunggu">Menunggu</option>
                  <option value="Ditolak">Ditolak</option>
                </>
              ) : (
                <>
                  <option value="Dipinjam">Dipinjam</option>
                  <option value="Dikembalikan">Dikembalikan</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 px-1 text-[11px] text-slate-400 italic font-medium print:hidden">
          <div>
            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100 font-sans font-semibold">
              Periode Laporan Aktif: {getReadablePeriod()}
            </span>
          </div>
          <div>
            {activeReportTab === "booking" 
              ? `Menampilkan ${filteredBookings.length} pemesanan terfilter`
              : `Menampilkan ${filteredBorrowings.length} peminjaman terfilter`
            }
          </div>
        </div>

        {/* Tab 1: Booking Reports tables */}
        {activeReportTab === "booking" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 bg-slate-50/20 print:bg-slate-100">
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Pemohon</th>
                  <th className="py-2.5 px-3">Laboratorium</th>
                  <th className="py-2.5 px-3">Tanggal Penggunaan</th>
                  <th className="py-2.5 px-3">Sesi / Jam</th>
                  <th className="py-2.5 px-3">Tujuan / Keperluan</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">Tidak ada data pemesanan yang cocok dengan kriteria filter.</td>
                  </tr>
                ) : (
                  filteredBookings.map((b, index) => (
                    <tr key={b.id} className="hover:bg-slate-50/20">
                      <td className="py-3 px-3 text-slate-400 font-mono">{index + 1}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {b.userName}
                        <span className="block text-[10px] text-slate-400 font-normal">{b.userRole}{b.classroom ? ` • ${formatClassroomName(b.classroom)}` : ""}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{b.labName}</td>
                      <td className="py-3 px-3 text-slate-600 font-mono">{b.date}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-blue-600 block">{b.sessionName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{b.sessionTime}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={b.purpose}>{b.purpose}</td>
                      <td className="py-3 px-3">
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Borrowing Reports tables */}
        {activeReportTab === "borrow" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 bg-slate-50/20 print:bg-slate-100">
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Barang Inventaris</th>
                  <th className="py-2.5 px-3">Jumlah</th>
                  <th className="py-2.5 px-3">Peminjam</th>
                  <th className="py-2.5 px-3">Tanggal Pinjam</th>
                  <th className="py-2.5 px-3">Batas Kembali</th>
                  <th className="py-2.5 px-3">Tujuan Pemakaian</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredBorrowings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">Tidak ada data peminjaman yang cocok dengan kriteria filter.</td>
                  </tr>
                ) : (
                  filteredBorrowings.map((b, index) => (
                    <tr key={b.id} className="hover:bg-slate-50/20">
                      <td className="py-3 px-3 text-slate-400 font-mono">{index + 1}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{b.itemName}</td>
                      <td className="py-3 px-3 font-semibold text-slate-600">{b.quantity} Unit</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-700">{b.borrowerName}</div>
                        <div className="text-[10px] text-slate-400">{b.borrowerRole}{b.classroom ? ` • ${formatClassroomName(b.classroom)}` : ""}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">{b.borrowDate}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-600 block font-mono">{b.returnDate}</span>
                        {b.actualReturnDate && (
                          <span className="text-[10px] text-emerald-600 block">Kembali: {b.actualReturnDate}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={b.purpose}>{b.purpose}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.status === "Dikembalikan" 
                            ? "bg-emerald-100 text-emerald-700" 
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Print Signatures */}
        <div className="hidden print:flex justify-end mt-16 text-center text-xs">
          <div className="w-1/2">
            <p>Bandung, {new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</p>
            <p className="mt-1">Mengetahui,</p>
            <p className="font-bold">Kepala Laboratorium Komputer</p>
            <p className="font-bold mt-16 underline">Aldy Prayogo, S. T.</p>
            <p className="text-slate-500 mt-1">NIP. 199005132022211013</p>
          </div>
        </div>

      </div>
    </div>
  );
}
