<?php

namespace App\Http\Controllers;

use App\Models\LabBooking;
use App\Models\LabRoom;
use App\Notifications\BookingStatusNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Validator;

class LabBookingController extends Controller
{
    /**
     * Menampilkan daftar semua pengajuan jadwal
     */
    public function index(Request $request)
    {
        $bookings = LabBooking::with('labRoom')
            ->orderBy('date', 'desc')
            ->orderBy('session_name', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $bookings
        ]);
    }

    /**
     * Mengajukan jadwal pemakaian lab baru dengan proteksi ketersediaan slot bentrok
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'lab_room_id' => 'required|exists:lab_rooms,id',
            'date' => 'required|date|after_or_equal:today',
            'session_name' => 'required|string',
            'session_time' => 'required|string',
            'user_name' => 'required|string|max:100',
            'user_role' => 'required|in:Guru,Siswa',
            'purpose' => 'required|string|min:5',
            'borrower_email' => 'required|email' // Email untuk pengiriman notifikasi otomatis
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        // PROTEKSI BENTROK: Cek apakah laboratorium di tanggal dan sesi tersebut sudah disetujui (Disetujui)
        $isConflict = LabBooking::where('lab_room_id', $request->lab_room_id)
            ->where('date', $request->date)
            ->where('session_name', $request->session_name)
            ->where('status', 'Disetujui')
            ->exists();

        if ($isConflict) {
            return response()->json([
                'status' => 'error',
                'message' => 'Laboratorium tidak tersedia. Sesi ini sudah dipesan dan disetujui oleh guru/kelas lain.'
            ], 409);
        }

        $booking = LabBooking::create([
            'lab_room_id' => $request->lab_room_id,
            'date' => $request->date,
            'session_name' => $request->session_name,
            'session_time' => $request->session_time,
            'user_name' => $request->user_name,
            'user_role' => $request->user_role,
            'purpose' => $request->purpose,
            'status' => 'Menunggu' // Default status menunggu persetujuan
        ]);

        // Opsional: Kirim notifikasi "Permintaan Menunggu" ke email Pemohon
        try {
            // Menggunakan Notification Facade untuk mengirim email pemberitahuan ke pemohon
            Notification::route('mail', $request->borrower_email)
                ->notify(new BookingStatusNotification($booking, 'Pengajuan Diterima & Sedang Ditinjau'));
        } catch (\Exception $e) {
            // Lanjutkan eksekusi meskipun SMTP email belum dikonfigurasi sepenuhnya
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Pengajuan jadwal berhasil dikirim dan sedang menunggu konfirmasi admin.',
            'data' => $booking
        ], 201);
    }

    /**
     * Menyetujui pengajuan jadwal dan memperbarui status laboratorium terkait
     */
    public function approve($id, Request $request)
    {
        $booking = LabBooking::findOrFail($id);
        
        if ($booking->status !== 'Menunggu') {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan jadwal ini sudah diproses sebelumnya.'
            ], 400);
        }

        // Pastikan kembali tidak ada pemesanan lain yang disetujui mendahului di sesi ini
        $isConflict = LabBooking::where('lab_room_id', $booking->lab_room_id)
            ->where('date', $booking->date)
            ->where('session_name', $booking->session_name)
            ->where('status', 'Disetujui')
            ->exists();

        if ($isConflict) {
            $booking->update(['status' => 'Ditolak']);
            return response()->json([
                'status' => 'error',
                'message' => 'Slot ini baru saja disetujui untuk pemesan lain. Pengajuan otomatis ditolak.'
            ], 409);
        }

        $booking->update(['status' => 'Disetujui']);

        // Update status laboratorium terkait menjadi 'Digunakan' jika jadwalnya hari ini
        if ($booking->date->isToday()) {
            $booking->labRoom->update(['status' => 'Digunakan']);
        }

        // Kirim Notifikasi Email Otomatis (Approved)
        if ($request->has('borrower_email')) {
            try {
                Notification::route('mail', $request->borrower_email)
                    ->notify(new BookingStatusNotification($booking, 'Disetujui'));
            } catch (\Exception $e) {}
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Jadwal pemakaian laboratorium berhasil disetujui.',
            'data' => $booking
        ]);
    }

    /**
     * Menolak pengajuan jadwal
     */
    public function reject($id, Request $request)
    {
        $booking = LabBooking::findOrFail($id);
        
        if ($booking->status !== 'Menunggu') {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan jadwal ini sudah diproses.'
            ], 400);
        }

        $booking->update(['status' => 'Ditolak']);

        // Kirim Notifikasi Email Otomatis (Rejected)
        if ($request->has('borrower_email')) {
            try {
                Notification::route('mail', $request->borrower_email)
                    ->notify(new BookingStatusNotification($booking, 'Ditolak'));
            } catch (\Exception $e) {}
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Pengajuan jadwal laboratorium berhasil ditolak.',
            'data' => $booking
        ]);
    }
}
