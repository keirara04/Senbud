<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    // Free AI on the web app, per device per day. The app shows the same numbers (mobile/src/api.ts).
    public const WEB_FREE_RECEIPTS = 3;

    public const WEB_FREE_QUESTIONS = 10;

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
        // A queue flush is one request of up to 50 events, so these are generous for people and tight for scripts.
        RateLimiter::for('events', fn (Request $request) => [
            Limit::perMinute(20)->by(self::who($request)), Limit::perDay(2000)->by('ip:'.$request->ip()),
        ]);

        $who = self::who(...);
        // The web app has no Pro yet, so its browsers get a small free allowance a day. Browsers can't
        // forge Origin; other clients can, but then they only get the app's caps above, as today.
        $web = fn (Request $request) => $request->header('Origin') === config('app.app_origin');
        $unlimited = self::unlimited(...);
        // The web caps go first: the first limit hit sets Retry-After, and the app reads a day-sized one
        // as "that's today's free allowance".
        RateLimiter::for('receipt', fn (Request $request) => $unlimited($request) ? Limit::none() : [
            ...($web($request) ? [Limit::perDay(self::WEB_FREE_RECEIPTS)->by('web:'.$who($request)), Limit::perDay(30)->by('web-ip:'.$request->ip())] : []),
            Limit::perMinute(6)->by($who($request)), Limit::perDay(60)->by($who($request)), Limit::perDay(200)->by('ip:'.$request->ip()),
        ]);
        // Separate keys from receipts (Laravel prefixes them with the limiter name), so asking never
        // uses up receipt reads.
        RateLimiter::for('ask', fn (Request $request) => $unlimited($request) ? Limit::none() : [
            ...($web($request) ? [Limit::perDay(self::WEB_FREE_QUESTIONS)->by('web:'.$who($request)), Limit::perDay(60)->by('web-ip:'.$request->ip())] : []),
            Limit::perMinute(10)->by($who($request)), Limit::perDay(100)->by($who($request)), Limit::perDay(300)->by('ip:'.$request->ip()),
        ]);
    }

    // Model calls cost money. Keyed by the app's anonymous device id when it sends one, else the IP;
    // the daily cap per IP stops one device id being rotated to dodge it.
    public static function who(Request $request): string
    {
        $device = $request->header('X-Device-Id');

        return is_string($device) && preg_match('/^[0-9a-f-]{36}$/i', $device) ? 'd:'.$device : 'ip:'.$request->ip();
    }

    // The owner's own builds send UNLIMITED_KEY in X-Unlimited-Key and skip every AI limit. A secret, not
    // the device id: that is the Support ID people paste into support chats. Unset = nobody is unlimited.
    public static function unlimited(Request $request): bool
    {
        $key = (string) config('app.unlimited_key');
        $sent = $request->header('X-Unlimited-Key');

        return $key !== '' && is_string($sent) && hash_equals($key, $sent);
    }
}
