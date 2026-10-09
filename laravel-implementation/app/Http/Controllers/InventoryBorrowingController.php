<?php

namespace App\Http\Controllers;

use App\Models\InventoryBorrowing;
use App\Models\InventoryItem;
use App\Notifications\OverdueBorrowingNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Validator;

class InventoryBorrowingController extends Controller
{
    /**
     * Menampilkan daftar semua transaksi peminjaman barang
     */
    public function index()
    {
        $borrowings = InventoryBorrowing::with('inventoryItem')
            ->orderBy('borrow_date', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $borrowings
        ]);
    }

    /**
     * Memproses transaksi peminjaman barang baru dengan validasi sisa stok ketersediaan
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'inventory_item_id' => 'required|exists:inventory_items,id',
            'quantity' => 'required|integer|min:1',
            'borrower_name' => 'required|string|max:100',
            'borrower_role' => 'required|in:Guru,Siswa',
            'borrow_date' => 'required|date|after_or_equal:today',
            'return_date' => 'required|date|after_or_equal:borrow_date',
            'purpose' => 'required|string|min:5',
            'borrower_email' => 'required|email'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $item = InventoryItem::findOrFail($request->inventory_item_id);

        // VALIDASI STOK: Cek apakah stok barang mencukupi peminjaman
        if ($item->available_qty < $request->quantity) {
            return response()->json([
                'status' => 'error',
                'message' => "Stok barang '{$item->name}' tidak mencukupi. Tersedia hanya {$item->available_qty} unit."
            ], 400);
        }

        // Jalankan pengurangan stok dalam transaksi database
        \DB::transaction(function () use ($request, $item, &$borrowing) {
            // Mengurangi stok tersedia
            $item->decrement('available_qty', $request->quantity);

            // Membuat record peminjaman
            $borrowing = InventoryBorrowing::create([
                'inventory_item_id' => $request->inventory_item_id,
                'quantity' => $request->quantity,
                'borrower_name' => $request->borrower_name,
                'borrower_role' => $request->borrower_role,
                'borrow_date' => $request->borrow_date,
                'return_date' => $request->return_date,
                'purpose' => $request->purpose,
                'status' => 'Dipinjam'
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Peminjaman inventaris berhasil diproses dan sisa stok barang telah diperbarui.',
            'data' => $borrowing
        ], 201);
    }

    /**
     * Memproses pengembalian barang inventaris & mendeteksi keterlambatan secara otomatis
     */
    public function returnItem($id, Request $request)
    {
        $borrowing = InventoryBorrowing::findOrFail($id);

        if ($borrowing->status === 'Dikembalikan') {
            return response()->json([
                'status' => 'error',
                'message' => 'Barang ini telah dikembalikan sebelumnya.'
            ], 400);
        }

        $actualReturnDate = Carbon::now()->toDateString();
        $isOverdue = Carbon::parse($actualReturnDate)->gt(Carbon::parse($borrowing->return_date));

        \DB::transaction(function () use ($borrowing, $actualReturnDate, $isOverdue) {
            // Mengembalikan stok tersedia ke inventaris
            $item = $borrowing->inventoryItem;
            $item->increment('available_qty', $borrowing->quantity);

            // Perbarui status peminjaman
            $borrowing->update([
                'actual_return_date' => $actualReturnDate,
                'status' => 'Dikembalikan'
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Proses pengembalian inventaris berhasil. Stok barang telah dikembalikan ke kondisi semula.',
            'data' => [
                'borrowing' => $borrowing,
                'overdue' => $isOverdue,
                'notes' => $isOverdue ? 'Pengembalian terlambat melewati tenggat waktu!' : 'Pengembalian tepat waktu.'
            ]
        ]);
    }

    /**
     * Fungsi Otomatis Cron / Task Scheduler untuk menandai peminjaman terlambat (Overdue)
     * Dapat dipanggil harian menggunakan Scheduler Laravel (Kernel.php)
     */
    public function checkOverdueAndNotify()
    {
        $today = Carbon::today()->toDateString();

        // Cari semua peminjaman berstatus "Dipinjam" yang tanggal kembalinya < hari ini
        $overdueBorrowings = InventoryBorrowing::where('status', 'Dipinjam')
            ->where('return_date', '<', $today)
            ->get();

        $count = 0;

        foreach ($overdueBorrowings as $borrowing) {
            $borrowing->update(['status' => 'Terlambat']);
            $count++;

            // Kirim email peringatan keterlambatan secara otomatis ke peminjam
            if (isset($borrowing->borrower_email)) {
                try {
                    Notification::route('mail', $borrowing->borrower_email)
                        ->notify(new OverdueBorrowingNotification($borrowing));
                } catch (\Exception $e) {}
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Pengecekan selesai. Sebanyak {$count} peminjaman ditandai sebagai terlambat (Terlambat) dan dinotifikasi."
        ]);
    }
}
