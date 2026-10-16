<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Behind a reverse proxy every request arrives from the proxy's IP, which would make the
        // per-IP rate limits global. Never '*': anyone could then spoof X-Forwarded-For and dodge
        // the limits. Unset = trust no one (API exposed directly).
        if ($proxies = config('app.trusted_proxies')) {
            TrustProxies::at(explode(',', $proxies));
        }

        RateLimiter::for('waitlist', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));

        // Model calls cost money. Keyed by the app's anonymous device id when it sends one, else the
        // IP; the daily cap per IP stops one device id being rotated to dodge it.
        $who = function (Request $request) {
            $device = $request->header('X-Device-Id');

            return is_string($device) && preg_match('/^[0-9a-f-]{36}$/i', $device) ? 'd:'.$device : 'ip:'.$request->ip();
        };
        RateLimiter::for('receipt', fn (Request $request) => [
            Limit::perMinute(6)->by($who($request)), Limit::perDay(60)->by($who($request)), Limit::perDay(200)->by('ip:'.$request->ip()),
        ]);
        // Separate keys from receipts (Laravel prefixes them with the limiter name), so asking never
        // uses up receipt reads.
        RateLimiter::for('ask', fn (Request $request) => [
            Limit::perMinute(10)->by($who($request)), Limit::perDay(100)->by($who($request)), Limit::perDay(300)->by('ip:'.$request->ip()),
        ]);
    }
}
