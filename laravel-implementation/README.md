# Sistem Informasi Laboratorium Komputer SMAN 1 Garut
## Laravel & MySQL Backend Implementation Codebase

Dokumen ini berisi source code backend lengkap menggunakan framework **Laravel 10/11** dan basis data **MySQL**. Kode ini telah dirancang secara modular dan mengikuti praktik terbaik (Best Practices) Laravel, termasuk Migrations, Eloquent Models, Controllers, Mailables, dan Notifications.

---

### Struktur Direktori Laravel
Berikut adalah peta file implementasi backend yang tersedia di folder ini:
1. **Migrations & Database Schema**
   - `database/migrations/2026_07_15_000001_create_lab_rooms_table.php` (Tabel Laboratorium)
   - `database/migrations/2026_07_15_000002_create_lab_bookings_table.php` (Tabel Penjadwalan Lab)
   - `database/migrations/2026_07_15_000003_create_inventory_items_table.php` (Tabel Barang Inventaris)
   - `database/migrations/2026_07_15_000004_create_inventory_borrowings_table.php` (Tabel Sirkulasi Peminjaman)
2. **Eloquent Models**
   - `app/Models/LabRoom.php`
   - `app/Models/LabBooking.php`
   - `app/Models/InventoryItem.php`
   - `app/Models/InventoryBorrowing.php`
3. **Business Logic Controllers**
   - `app/Http/Controllers/LabBookingController.php` (Pengecekan slot bentrok & booking)
   - `app/Http/Controllers/InventoryBorrowingController.php` (Peminjaman & Pengembalian Inventaris)
   - `app/Http/Controllers/LabReportController.php` (Penyusunan laporan & ekspor real-time CSV/PDF)
4. **Notifications & Mails**
   - `app/Notifications/BookingStatusNotification.php` (Email konfirmasi/penolakan jadwal otomatis)
   - `app/Notifications/OverdueBorrowingNotification.php` (Notifikasi pengembalian terlambat)

---

### Cara Instalasi & Menjalankan di Server Laravel Anda:

1. **Persiapan Project Laravel Baru:**
   ```bash
   composer create-project laravel/laravel silab-kom-sman1garut
   cd silab-kom-sman1garut
   ```

2. **Konfigurasi Database `.env`:**
   Sesuaikan detail koneksi MySQL dan SMTP Email Anda di file `.env` project Laravel Anda:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=db_silab_kom
   DB_USERNAME=root
   DB_PASSWORD=rahasia

   MAIL_MAILER=smtp
   MAIL_HOST=smtp.mailtrap.io
   MAIL_PORT=2525
   MAIL_USERNAME=your_username
   MAIL_PASSWORD=your_password
   MAIL_ENCRYPTION=tls
   MAIL_FROM_ADDRESS="admin.lab@sman1garut.sch.id"
   MAIL_FROM_NAME="UPT Laboratorium Komputer SMAN 1 Garut"
   ```

3. **Salin Kode Sumber:**
   Salin file-file PHP dari folder `/laravel-implementation/` ini ke direktori project Laravel Anda sesuai struktur path masing-masing file.

4. **Jalankan Migrasi & Seeder Database:**
   ```bash
   php artisan migrate --seed
   ```

5. **Jalankan Aplikasi:**
   ```bash
   php artisan serve
   ```
   Aplikasi API/Backend Anda kini siap melayani permintaan sirkulasi lab dan peminjaman inventaris real-time!
