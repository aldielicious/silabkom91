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
        Schema::create('inventory_borrowings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->onDelete('cascade');
            $table->integer('quantity');
            $table->string('borrower_name');
            $table->enum('borrower_role', ['Guru', 'Siswa']);
            $table->date('borrow_date'); // Tanggal mulai meminjam
            $table->date('return_date'); // Batas akhir peminjaman (expected)
            $table->date('actual_return_date')->nullable(); // Tanggal pengembalian riil
            $table->string('purpose'); // Keperluan peminjaman
            $table->enum('status', ['Dipinjam', 'Dikembalikan', 'Terlambat'])->default('Dipinjam');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_borrowings');
    }
};
