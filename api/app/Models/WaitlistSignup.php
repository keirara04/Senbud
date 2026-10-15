<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['email', 'feature', 'referral_code', 'referred_by', 'confirm_token', 'confirm_token_created_at'])]
class WaitlistSignup extends Model
{
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'confirm_token_created_at' => 'datetime',
            'confirmed_at' => 'datetime',
        ];
    }
}
