<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LabBooking extends Model
{
    use HasFactory;

    protected $fillable = [
        'lab_room_id',
        'date',
        'session_name',
        'session_time',
        'user_name',
        'user_role',
        'purpose',
        'status',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
    ];

    /**
     * Relasi balik ke ruangan lab
     */
    public function labRoom(): BelongsTo
    {
        return $this->belongsTo(LabRoom::class, 'lab_room_id');
    }
}
