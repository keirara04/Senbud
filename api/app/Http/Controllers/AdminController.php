<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\Response;

// The owner's usage page: who uses Senbud where, what they do, the waitlist and what AI costs.
class AdminController extends Controller
{
    private const PLATFORMS = ['ios', 'android', 'web'];

    public function index(): View
    {
        $events = DB::table('events');
        $active = fn (int $days) => (clone $events)->whereIn('platform', self::PLATFORMS)
            ->where('occurred_at', '>=', now()->subDays($days))
            ->selectRaw('platform, count(distinct device_id) as n')->groupBy('platform')->pluck('n', 'platform');

        $since30 = now()->subDays(30)->startOfDay();
        $perDay = fn ($query) => $query->where('occurred_at', '>=', $since30)
            ->selectRaw('date(occurred_at) as day, count(*) as n')->groupBy('day')->pluck('n', 'day');
        $days = collect(range(29, 0))->map(fn ($i) => now()->subDays($i)->toDateString())->all();

        // ponytail: props are read in PHP over 30 days of rows. Fine to tens of thousands; move to
        // JSON SQL or daily roll-ups if the page gets slow.
        $ai = (clone $events)->where('platform', 'server')->where('occurred_at', '>=', $since30)->get(['name', 'props', 'occurred_at'])
            ->map(fn ($e) => ['name' => $e->name, 'day' => substr((string) $e->occurred_at, 0, 10)] + (json_decode((string) $e->props, true) ?: []));
        $pages = (clone $events)->where('platform', 'site')->where('occurred_at', '>=', $since30)->pluck('props')
            ->map(fn ($p) => json_decode((string) $p, true)['path'] ?? '/')->countBy()->sortDesc()->take(8);

        $waitlist = DB::table('waitlist_signups');

        return view('admin.index', [
            'active' => ['1' => $active(1), '7' => $active(7), '30' => $active(30)],
            'platforms' => self::PLATFORMS,
            'days' => $days,
            'appEvents' => $perDay((clone $events)->whereIn('platform', self::PLATFORMS)),
            'siteViews' => $perDay((clone $events)->where('platform', 'site')),
            'topEvents' => (clone $events)->whereIn('platform', self::PLATFORMS)->where('occurred_at', '>=', now()->subDay())
                ->selectRaw('name, count(*) as n')->groupBy('name')->orderByDesc('n')->pluck('n', 'name'),
            'pages' => $pages,
            'ai' => [
                'calls' => $ai->count(),
                'failed' => $ai->filter(fn ($e) => ($e['status'] ?? 0) !== 200)->count(),
                'tokens' => $ai->sum(fn ($e) => ($e['tokens_in'] ?? 0) + ($e['tokens_out'] ?? 0)),
                'cost' => $ai->sum('cost'),
                'today' => $ai->where('day', now()->toDateString())->sum('cost'),
                'byKind' => $ai->groupBy('name')->map->count(),
            ],
            'waitlist' => [
                'total' => (clone $waitlist)->count(),
                'confirmed' => (clone $waitlist)->whereNotNull('confirmed_at')->count(),
                'week' => (clone $waitlist)->where('created_at', '>=', now()->subDays(7))->count(),
                'referrers' => (clone $waitlist)->where('referrals_count', '>', 0)->orderByDesc('referrals_count')->limit(5)->get(['email', 'referrals_count']),
            ],
        ]);
    }

    // One device's timeline. The id is the Support ID people paste into support chats.
    public function device(Request $request, ?string $id = null): View|Response
    {
        $id = strtolower(trim((string) ($id ?? $request->query('id'))));
        // Settings shows the first 8 characters; Copy gives the whole id. Either works here.
        if (preg_match('/^[0-9a-f]{8}$/', $id)) {
            $ids = DB::table('events')->whereRaw('CAST(device_id AS TEXT) LIKE ?', [$id.'-%'])->distinct()->limit(2)->pluck('device_id');
            $id = $ids->count() === 1 ? $ids[0] : $id;
        }
        if ($id !== '' && $id !== $request->route('id')) {
            return redirect()->route('admin.device', ['id' => $id]);
        }
        abort_unless(Str::isUuid($id), 404);

        $events = DB::table('events')->where('device_id', $id)->orderByDesc('occurred_at')->limit(500)
            ->get(['name', 'platform', 'app_version', 'props', 'occurred_at']);

        return view('admin.device', [
            'id' => $id,
            'events' => $events,
            'first' => DB::table('events')->where('device_id', $id)->min('occurred_at'),
        ]);
    }
}
