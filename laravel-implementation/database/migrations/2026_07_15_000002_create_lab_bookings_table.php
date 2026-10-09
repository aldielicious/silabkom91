<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('lab_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_room_id')->constrained('lab_rooms')->onDelete('cascade');
            $table->date('date'); // Format: YYYY-MM-DD
            $table->string('session_name'); // Contoh: "Sesi 1", "Sesi 2"
            $table->string('session_time'); // Contoh: "07:30 - 09:00"
            $table->string('user_name'); // Nama Guru atau Siswa pemohon
            $table->enum('user_role', ['Guru', 'Siswa']);
            $table->text('purpose'); // Tujuan penggunaan lab
            $table->enum('status', ['Menunggu', 'Disetujui', 'Ditolak'])->default('Menunggu');
            $table->timestamps();

            // Index gabungan untuk mempercepat pengecekan slot bentrok
            $table->unique(['lab_room_id', 'date', 'session_name'], 'unique_lab_session');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lab_bookings');
    }
};
