<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'category',
        'total_qty',
        'available_qty',
        'location',
    ];

    /**
     * Relasi ke riwayat peminjaman barang ini
     */
    public function borrowings(): HasMany
    {
        return $this->hasMany(InventoryBorrowing::class);
    }
}
