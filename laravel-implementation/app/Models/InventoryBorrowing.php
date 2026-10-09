<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryBorrowing extends Model
{
    use HasFactory;

    protected $fillable = [
        'inventory_item_id',
        'quantity',
        'borrower_name',
        'borrower_role',
        'borrow_date',
        'return_date',
        'actual_return_date',
        'purpose',
        'status',
    ];

    protected $casts = [
        'borrow_date' => 'date:Y-m-d',
        'return_date' => 'date:Y-m-d',
        'actual_return_date' => 'date:Y-m-d',
    ];

    /**
     * Relasi balik ke barang inventaris
     */
    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}
