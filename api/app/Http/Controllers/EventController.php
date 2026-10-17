<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Usage events: the app's batched queue (mobile/src/analytics.ts) and the landing site's page views.
// Privacy contract (the Settings toggle and the store data forms rely on it): names and a few small
// props only, never amounts, merchants, labels or anything typed. Anyone can post here, so the numbers
// are a guide, not an audit.
class EventController extends Controller
{
    // Must match EventName in mobile/src/db.ts. AI use is recorded by the API itself (OpenRouter::record).
    public const APP_EVENTS = ['app_open', 'screen', 'setup_done', 'txn_added', 'limit_set', 'treat_added', 'pro_bought'];

    public const SITE_EVENTS = ['page_view'];

    public function __invoke(Request $request): Response
    {
        $site = $request->input('platform') === 'site';
        $data = $request->validate([
            'platform' => ['required', 'in:ios,android,web,site'],
            'app_version' => ['nullable', 'string', 'max:16'],
            'events' => ['required', 'array', 'min:1', 'max:50'],
            'events.*.id' => ['required', 'uuid'],
            'events.*.name' => ['required', 'in:'.implode(',', $site ? self::SITE_EVENTS : self::APP_EVENTS)],
            'events.*.at' => ['required', 'date'],
            'events.*.props' => ['nullable', 'array', 'max:5', function ($attribute, $value, $fail) {
                foreach ($value as $v) {
                    if (! is_scalar($v) || (is_string($v) && mb_strlen($v) > 100)) {
                        $fail('Props are short plain values.');
                    }
                }
            }],
        ]);

        $device = $site ? null : self::deviceId($request);
        if (! $site && ! $device) {
            return response()->noContent(422);
        }

        $now = now();
        DB::table('events')->insertOrIgnore(array_map(fn ($e) => [
            'client_id' => strtolower($e['id']),
            'device_id' => $device,
            'platform' => $data['platform'],
            'app_version' => $data['app_version'] ?? null,
            'name' => $e['name'],
            'props' => empty($e['props']) ? null : json_encode($e['props']),
            // Phone clocks drift; nothing lands in the future.
            'occurred_at' => min($now, Carbon::parse($e['at'])->utc()),
        ], $data['events']));

        // ponytail: events are kept 90 days (the privacy page says so), pruned here on about one request
        // in 200 since the container runs no scheduler. Add daily roll-up tables if longer history is needed.
        if (random_int(1, 200) === 1) {
            DB::table('events')->where('occurred_at', '<', now()->subDays(90))->delete();
        }

        return response()->noContent(202);
    }

    // Recorded by the API itself (AI calls and their token use), so the admin page can show the cost.
    public static function server(Request $request, string $name, array $props): void
    {
        DB::table('events')->insert([
            'client_id' => (string) Str::uuid(),
            'device_id' => self::deviceId($request),
            'platform' => 'server',
            'app_version' => null,
            'name' => $name,
            'props' => json_encode($props),
            'occurred_at' => now(),
        ]);
    }

    private static function deviceId(Request $request): ?string
    {
        $id = $request->header('X-Device-Id');

        return is_string($id) && Str::isUuid($id) ? strtolower($id) : null;
    }
}
