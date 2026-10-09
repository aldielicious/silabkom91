<?php

namespace App\Notifications;

use App\Models\InventoryBorrowing;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OverdueBorrowingNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $borrowing;

    /**
     * Create a new notification instance.
     */
    public function __construct(InventoryBorrowing $borrowing)
    {
        $this->borrowing = $borrowing;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $itemName = $this->borrowing->inventoryItem->name ?? 'Barang Inventaris';
        $returnDate = $this->borrowing->return_date->format('d-m-Y');

        return (new MailMessage)
            ->subject("[SILAB-KOM SMAN 1 Garut] PEMBERITAHUAN: Pengembalian Inventaris Terlambat!")
            ->greeting("Halo, " . $this->borrowing->borrower_name)
            ->line("Pemberitahuan resmi dari UPT Laboratorium Komputer SMAN 1 Garut.")
            ->line("Sistem mencatat bahwa peminjaman barang inventaris berikut telah melewati tenggat batas waktu pengembalian yang ditentukan:")
            ->line("• Nama Barang: " . $itemName)
            ->line("• Jumlah Barang: " . $this->borrowing->quantity . " Unit")
            ->line("• Tanggal Peminjaman: " . $this->borrowing->borrow_date->format('d-m-Y'))
            ->line("• Batas Pengembalian: " . $returnDate)
            ->line("• Status Saat Ini: Terlambat (Overdue)")
            ->line("Harap segera mengembalikan barang tersebut ke ruang laboratorium komputer SMAN 1 Garut untuk diperiksa kelengkapannya dan diserahkan ke penanggung jawab lab.")
            ->action('Konfirmasi Pengembalian Barang', url('/borrowings/return'))
            ->line("Bila Anda sudah mengembalikan barang ini namun status belum berubah, silakan hubungi asisten laboratorium komputer.")
            ->salutation("Salam Terbuka,\nUPT Laboratorium Komputer SMAN 1 Garut");
    }

    /**
     * Get the array representation of the notification for database logs.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'borrowing_id' => $this->borrowing->id,
            'item_name' => $this->borrowing->inventoryItem->name ?? 'Barang Inventaris',
            'quantity' => $this->borrowing->quantity,
            'status' => 'Terlambat',
            'message' => "Peringatan: Peminjaman {$this->borrowing->quantity} unit " . ($this->borrowing->inventoryItem->name ?? 'alat') . " terlambat dikembalikan."
        ];
    }
}
