<?php

namespace App\Http\Controllers;

use App\Mail\WaitlistConfirmation;
use App\Models\WaitlistSignup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class WaitlistController extends Controller
{
    public const FEATURES = ['receipt', 'afford', 'split', 'subscriptions', 'wrapped'];

    public const TOKEN_DAYS = 7;

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:254'],
            'feature' => ['nullable', 'string', 'in:'.implode(',', self::FEATURES)],
        ]);

        // A bad ref from a mangled share link must never block the signup: anything that isn't a
        // known code is ignored.
        $ref = $request->input('ref');

        // createOrFirst survives two requests racing on the unique email index. A repeat signup
        // keeps its original feature and referrer.
        $signup = WaitlistSignup::createOrFirst(
            ['email' => Str::lower($data['email'])],
            [
                'feature' => $data['feature'] ?? null,
                // ponytail: no retry on a code collision (1 in 62^8 per pair); add one if the list gets huge.
                'referral_code' => Str::random(8),
                'referred_by' => is_string($ref) ? WaitlistSignup::where('referral_code', $ref)->value('id') : null,
            ],
        );

        // At most one email per address every 5 minutes, so nobody can flood an inbox through
        // this form. A confirmed address has nothing to confirm and gets no email.
        if (! $signup->confirmed_at) {
            RateLimiter::attempt('waitlist-mail:'.sha1($signup->email), 1, fn () => $this->sendConfirmation($signup), 300);
        }

        // Same status and body whether the email is new, pending or confirmed: the API never
        // reveals who is already on the list.
        return response()->json(['ok' => true, 'status' => 'pending_confirmation']);
    }

    public function confirm(string $token): RedirectResponse
    {
        $web = rtrim(config('app.web_origin'), '/');

        $signup = WaitlistSignup::where('confirm_token', hash('sha256', $token))
            ->where('confirm_token_created_at', '>', now()->subDays(self::TOKEN_DAYS))
            ->first();

        if (! $signup) {
            return redirect()->away("{$web}/confirmed?status=invalid");
        }

        // The token stays valid until it expires: mail scanners open links before people do, and a second
        // click should still land on the referral code.
        DB::transaction(function () use ($signup) {
            // Conditional update: repeat or racing clicks credit the referrer once.
            $first = WaitlistSignup::whereKey($signup->id)->whereNull('confirmed_at')
                ->update(['confirmed_at' => now()]);

            if ($first && $signup->referred_by) {
                WaitlistSignup::whereKey($signup->referred_by)->increment('referrals_count');
            }
        });

        return redirect()->away("{$web}/confirmed?code={$signup->referral_code}");
    }

    private function sendConfirmation(WaitlistSignup $signup): void
    {
        // A new token each time: the latest email's link is the one that works.
        $token = Str::random(40);
        $signup->update(['confirm_token' => hash('sha256', $token), 'confirm_token_created_at' => now()]);

        // Built from APP_URL, never the request's Host header, so a forged Host can't poison the link.
        $url = rtrim(config('app.url'), '/')."/v1/waitlist/confirm/{$token}";

        // ponytail: sent inline; queue it once the API runs a queue worker.
        Mail::to($signup->email)->send(new WaitlistConfirmation($url));
    }
}
