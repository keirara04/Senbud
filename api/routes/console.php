<?php

use App\Models\WaitlistSignup;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('waitlist:order', function () {
    $rows = WaitlistSignup::whereNotNull('confirmed_at')
        ->orderByDesc('referrals_count')->orderBy('confirmed_at')->orderBy('id')
        ->get(['email', 'referral_code', 'referrals_count', 'confirmed_at']);

    $this->table(
        ['#', 'Email', 'Code', 'Referrals', 'Confirmed at'],
        $rows->map(fn ($r, $i) => [$i + 1, $r->email, $r->referral_code, $r->referrals_count, $r->confirmed_at])->all(),
    );
})->purpose('Print confirmed waitlist signups in invite order');
