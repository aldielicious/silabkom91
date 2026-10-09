<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LabRoom extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'capacity',
        'equipment',
        'status',
    ];

    protected $casts = [
        'equipment' => 'array', // Casting otomatis dari JSON ke array PHP
    ];

    /**
     * Relasi ke pemesanan lab (LabBookings)
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(LabBooking::class);
    }
}
