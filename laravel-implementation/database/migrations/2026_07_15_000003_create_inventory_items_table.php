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
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category'); // Contoh: "Komputer", "Aksesoris", "Jaringan"
            $table->integer('total_qty')->default(1);
            $table->integer('available_qty')->default(1);
            $table->string('location'); // Contoh: "Lab Komputer Utama", "Gudang Lab"
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};
