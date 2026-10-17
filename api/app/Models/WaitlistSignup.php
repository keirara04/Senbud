<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['email', 'feature', 'referral_code', 'referred_by', 'confirm_token', 'confirm_token_created_at'])]
class WaitlistSignup extends Model
{
    public const UPDATED_AT = null;

    // Invite order: people who brought friends first, then by when they confirmed.
    public function scopeInviteOrder(Builder $query): void
    {
        $query->orderByDesc('referrals_count')->orderBy('confirmed_at')->orderBy('id');
    }

    protected function casts(): array
    {
        return [
            'confirm_token_created_at' => 'datetime',
            'confirmed_at' => 'datetime',
        ];
    }
}
