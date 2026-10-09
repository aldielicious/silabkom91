<?php

namespace App\Http\Controllers;

use App\Models\InventoryBorrowing;
use App\Models\LabBooking;
use Barryvdh\DomPDF\Facade\Pdf; // Menggunakan library barryvdh/laravel-dompdf yang populer
use Illuminate\Http\Request;

class LabReportController extends Controller
{
    /**
     * Memperoleh statistik agregat peminjaman & penggunaan lab dalam satu respon real-time
     */
    public function getSummaryStats(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        // Query dasar pemakaian lab
        $bookingQuery = LabBooking::where('status', 'Disetujui');
        if ($startDate) {
            $bookingQuery->where('date', '>=', $startDate);
        }
        if ($endDate) {
            $bookingQuery->where('date', '<=', $endDate);
        }
        $bookings = $bookingQuery->get();

        // Hitung frekuensi penggunaan per lab
        $labFrequency = $bookings->groupBy('lab_room_id')->map(function ($items) {
            return [
                'lab_name' => $items->first()->labRoom->name ?? 'Lab Tidak Diketahui',
                'frequency' => $items->count(),
                'duration_hours' => $items->count() * 1.5 // Asumsi 1 sesi = 1.5 jam (90 menit)
            ];
        })->values();

        // Query peminjaman inventaris
        $borrowQuery = InventoryBorrowing::query();
        if ($startDate) {
            $borrowQuery->where('borrow_date', '>=', $startDate);
        }
        if ($endDate) {
            $borrowQuery->where('borrow_date', '<=', $endDate);
        }
        $borrowings = $borrowQuery->get();

        $borrowingSummary = [
            'total_borrowed' => $borrowings->where('status', 'Dipinjam')->sum('quantity'),
            'total_returned' => $borrowings->where('status', 'Dikembalikan')->sum('quantity'),
            'total_overdue' => $borrowings->where('status', 'Terlambat')->sum('quantity'),
        ];

        return response()->json([
            'status' => 'success',
            'data' => [
                'period' => [
                    'start_date' => $startDate ?: 'Mulai awal',
                    'end_date' => $endDate ?: 'Hingga kini'
                ],
                'lab_usage_frequency' => $labFrequency,
                'inventory_borrowing_status' => $borrowingSummary
            ]
        ]);
    }

    /**
     * Ekspor Laporan Pemakaian Ruang Lab ke format CSV
     */
    public function exportLabUsageCSV(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $query = LabBooking::with('labRoom')->where('status', 'Disetujui');
        if ($startDate) {
            $query->where('date', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('date', '<=', $endDate);
        }
        $bookings = $query->orderBy('date', 'asc')->get();

        $filename = "laporan_penggunaan_lab_" . date('Ymd_His') . ".csv";
        
        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$filename",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = ['No', 'Nama Pemesan', 'Peran', 'Laboratorium', 'Tanggal Pemakaian', 'Sesi', 'Durasi (Jam)', 'Tujuan'];

        $callback = function() use($bookings, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($bookings as $key => $booking) {
                fputcsv($file, [
                    $key + 1,
                    $booking->user_name,
                    $booking->user_role,
                    $booking->labRoom->name ?? '-',
                    $booking->date->format('Y-m-d'),
                    $booking->session_name . " (" . $booking->session_time . ")",
                    '1.5 Jam',
                    $booking->purpose
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Ekspor Laporan Peminjaman Inventaris ke format CSV
     */
    public function exportInventoryCSV(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $query = InventoryBorrowing::with('inventoryItem');
        if ($startDate) {
            $query->where('borrow_date', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('borrow_date', '<=', $endDate);
        }
        $borrowings = $query->orderBy('borrow_date', 'asc')->get();

        $filename = "laporan_peminjaman_inventaris_" . date('Ymd_His') . ".csv";

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$filename",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = ['No', 'Nama Barang', 'Jumlah', 'Peminjam', 'Peran', 'Tanggal Pinjam', 'Tenggat Kembali', 'Tanggal Aktual Kembali', 'Status'];

        $callback = function() use($borrowings, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($borrowings as $key => $b) {
                fputcsv($file, [
                    $key + 1,
                    $b->inventoryItem->name ?? '-',
                    $b->quantity,
                    $b->borrower_name,
                    $b->borrower_role,
                    $b->borrow_date->format('Y-m-d'),
                    $b->return_date->format('Y-m-d'),
                    $b->actual_return_date ? $b->actual_return_date->format('Y-m-d') : 'Belum Kembali',
                    $b->status
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Ekspor Laporan Gabungan ke format PDF menggunakan Laravel DomPDF
     */
    public function exportCombinedReportPDF(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $bookings = LabBooking::with('labRoom')
            ->where('status', 'Disetujui')
            ->when($startDate, fn($q) => $q->where('date', '>=', $startDate))
            ->when($endDate, fn($q) => $q->where('date', '<=', $endDate))
            ->orderBy('date', 'asc')
            ->get();

        $borrowings = InventoryBorrowing::with('inventoryItem')
            ->when($startDate, fn($q) => $q->where('borrow_date', '>=', $startDate))
            ->when($endDate, fn($q) => $q->where('borrow_date', '<=', $endDate))
            ->orderBy('borrow_date', 'asc')
            ->get();

        // Siapkan data untuk view pdf
        $data = [
            'school_name' => 'SMAN 1 Garut',
            'title' => 'Laporan Operasional Laboratorium Komputer SMAN 1 Garut',
            'period' => [
                'start' => $startDate ?: 'Awal Mulai',
                'end' => $endDate ?: 'Hingga Kini'
            ],
            'bookings' => $bookings,
            'borrowings' => $borrowings,
            'generated_at' => now()->format('d-m-Y H:i:s')
        ];

        // Memuat view PDF (resources/views/reports/combined_pdf.blade.php)
        // Dan mengunduh PDF-nya
        $pdf = Pdf::loadView('reports.combined_pdf', $data);
        return $pdf->download('Laporan_SILABKOM_SMAN1Garut.pdf');
    }
}
