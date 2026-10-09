<?php

namespace App\Notifications;

use App\Models\LabBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BookingStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $booking;
    protected $actionType;

    /**
     * Create a new notification instance.
     */
    public function __construct(LabBooking $booking, string $actionType)
    {
        $this->booking = $booking;
        $this->actionType = $actionType;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database']; // Mengirim via Email & mencatat di database internal
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $statusLabel = $this->booking->status;
        $subject = "[SILAB-KOM SMAN 1 Garut] Pemberitahuan Jadwal Penggunaan Lab - " . $this->actionType;

        $mailMessage = (new MailMessage)
            ->subject($subject)
            ->greeting("Halo, " . $this->booking->user_name)
            ->line("Berikut ini kami sampaikan perkembangan terbaru pengajuan jadwal penggunaan Laboratorium Komputer SMAN 1 Garut:")
            ->line("• Ruang Laboratorium: " . ($this->booking->labRoom->name ?? 'Lab Komputer'))
            ->line("• Tanggal Pemakaian: " . $this->booking->date->format('d-m-Y'))
            ->line("• Sesi Jam: " . $this->booking->session_name . " (" . $this->booking->session_time . ")")
            ->line("• Keperluan: " . $this->booking->purpose)
            ->line("• Status Pengajuan: " . $statusLabel);

        if ($statusLabel === 'Disetujui') {
            $mailMessage->line("Selamat! Pengajuan Anda telah DISETUJUI oleh Admin Lab. Silakan gunakan ruang praktikum dengan tertib sesuai jam yang dijadwalkan.")
                ->action('Lihat Kalender Real-Time', url('/dashboard/calendar'));
        } elseif ($statusLabel === 'Ditolak') {
            $mailMessage->line("Mohon maaf, pengajuan Anda DITOLAK oleh Admin karena terdapat bentrok jadwal/sesi, atau sedang dilaksanakan pemeliharaan sistem.")
                ->action('Cari Slot Sesi Lain', url('/dashboard/calendar'));
        } else {
            $mailMessage->line("Sistem telah mencatat pengajuan Anda. Saat ini pengajuan sedang ditinjau oleh Kepala Lab.");
        }

        return $mailMessage->line("Terima kasih atas kerja sama Anda dalam menjaga kelancaran sirkulasi laboratorium.")
            ->salutation("Salam Hangat,\nUPT Laboratorium Komputer SMAN 1 Garut");
    }

    /**
     * Get the array representation of the notification for Database storage.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'booking_id' => $this->booking->id,
            'lab_name' => $this->booking->labRoom->name ?? 'Lab Komputer',
            'date' => $this->booking->date->format('Y-m-d'),
            'status' => $this->booking->status,
            'message' => "Pengajuan jadwal lab komputer pada " . $this->booking->date->format('d-m-Y') . " telah diperbarui: " . $this->booking->status
        ];
    }
}
