<?php

namespace App\Http\Controllers;

use App\Models\WaitlistSignup;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
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
            ->map(fn ($e) => ['name' => $e->name, 'at' => (string) $e->occurred_at, 'day' => substr((string) $e->occurred_at, 0, 10)] + (json_decode((string) $e->props, true) ?: []));
        $pages = (clone $events)->where('platform', 'site')->where('occurred_at', '>=', $since30)->pluck('props')
            ->map(fn ($p) => json_decode((string) $p, true)['path'] ?? '/')->countBy()->sortDesc()->take(8);

        $waitlist = DB::table('waitlist_signups');
        $app = self::appRows();
        $active7 = $app->where('at', '>=', now()->subDays(7))->pluck('device_id')->unique()->count();
        $ai7 = $ai->where('day', '>=', now()->subDays(6)->toDateString());

        return view('admin.index', [
            'grants' => DB::table('pro_grants')->where(fn ($q) => $q->whereNull('until')->orWhere('until', '>', now()))
                ->orderByDesc('created_at')->limit(20)->get(),
            'funnel' => self::funnel($app),
            'retention' => self::retention($app),
            'reach' => self::reach($app, $active7),
            'versions' => $app->where('at', '>=', now()->subDays(7))->groupBy(fn ($e) => $e->platform.' '.($e->app_version ?? '?'))
                ->map(fn ($g) => $g->pluck('device_id')->unique()->count())->sortDesc(),
            'pro' => [
                'paywall' => $app->filter(fn ($e) => $e->name === 'screen' && ($e->props['path'] ?? null) === '/pro')->pluck('device_id')->unique()->count(),
                'bought' => $app->where('name', 'pro_bought')->pluck('device_id')->unique()->count(),
            ],
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
                'avgCost' => $ai->groupBy('name')->map(fn ($g) => $g->avg('cost')),
                'todayCalls' => $ai->where('day', now()->toDateString())->count(),
                'todayFailed' => $ai->where('day', now()->toDateString())->filter(fn ($e) => ($e['status'] ?? 0) !== 200)->count(),
                'perDevice' => $active7 ? $ai7->sum('cost') / $active7 : 0,
                'failures' => $ai->filter(fn ($e) => ($e['status'] ?? 0) !== 200)->sortByDesc('at')->take(10)->values(),
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
            'grant' => DB::table('pro_grants')->where('device_id', $id)->first(),
        ]);
    }

    // Pro for one device, from its page: a month, a year, or no end. Granting again replaces the old grant.
    public function grantPro(Request $request, string $id): RedirectResponse
    {
        abort_unless(Str::isUuid($id), 404);
        $data = $request->validate(['months' => ['required', 'in:1,12,0'], 'note' => ['nullable', 'string', 'max:120']]);
        DB::table('pro_grants')->updateOrInsert(['device_id' => strtolower($id)], [
            'until' => $data['months'] === '0' ? null : now()->addMonths((int) $data['months']),
            'note' => $data['note'] ?? null,
            'created_at' => now(),
        ]);

        return redirect()->route('admin.device', ['id' => strtolower($id)]);
    }

    public function revokePro(string $id): RedirectResponse
    {
        abort_unless(Str::isUuid($id), 404);
        DB::table('pro_grants')->where('device_id', strtolower($id))->delete();

        return redirect()->route('admin.device', ['id' => strtolower($id)]);
    }

    public function deleteDevice(string $id): RedirectResponse
    {
        abort_unless(Str::isUuid($id), 404);
        DB::table('events')->where('device_id', strtolower($id))->delete();

        return redirect()->route('admin.device', ['id' => strtolower($id)]);
    }

    public function waitlist(Request $request): View
    {
        $q = trim((string) $request->query('q'));
        // Emails are saved lowercased (WaitlistController), so this matches any case on Postgres too.
        $search = fn ($query) => $q === '' ? $query : $query->where('email', 'like', '%'.Str::lower($q).'%');

        // ponytail: capped at 500 rows each, no paging. Add paging past a few thousand signups.
        return view('admin.waitlist', [
            'q' => $q,
            'confirmed' => $search(WaitlistSignup::whereNotNull('confirmed_at')->inviteOrder())->limit(500)->get(),
            'pending' => $search(WaitlistSignup::whereNull('confirmed_at')->orderByDesc('created_at'))->limit(500)->get(),
        ]);
    }

    // Confirmed signups in invite order, for sending invites.
    public function waitlistCsv(): Response
    {
        $rows = WaitlistSignup::whereNotNull('confirmed_at')->inviteOrder()->get(['email', 'referral_code', 'referrals_count', 'confirmed_at']);
        // Emails are typed by strangers: a leading = + - @ would run as a formula in a spreadsheet.
        $cell = fn ($v) => '"'.str_replace('"', '""', preg_replace('/^([=+\-@])/', "'$1", (string) $v)).'"';
        $csv = "rank,email,referral_code,referrals,confirmed_at\n".$rows->map(fn ($r, $i) => implode(',', [
            $i + 1, $cell($r->email), $cell($r->referral_code), $r->referrals_count, $cell($r->confirmed_at?->toIso8601String()),
        ]))->join("\n")."\n";

        return response($csv, 200, ['Content-Type' => 'text/csv', 'Content-Disposition' => 'attachment; filename="senbud-waitlist-'.now()->toDateString().'.csv"']);
    }

    // "Want off the list?" from the privacy page. The foreign key unlinks anyone they referred.
    // Looked up here, not by route binding: binding runs before AdminGate and would answer 404 to anyone.
    public function deleteSignup(int $id): RedirectResponse
    {
        WaitlistSignup::findOrFail($id)->delete();

        return redirect()->route('admin.waitlist');
    }

    // App events from the last 90 days (all that's kept), with props decoded.
    // ponytail: read into PHP for the funnel, retention and reach. Fine to a few hundred thousand rows;
    // move to daily roll-up tables when the page gets slow. A device quiet for 60+ days that comes back
    // looks new, since its older events are pruned.
    private static function appRows(): Collection
    {
        return DB::table('events')->whereIn('platform', self::PLATFORMS)->where('occurred_at', '>=', now()->subDays(90))
            ->orderBy('occurred_at')->get(['device_id', 'platform', 'app_version', 'name', 'props', 'occurred_at'])
            ->map(function ($e) {
                $e->at = Carbon::parse($e->occurred_at);
                $e->day = $e->at->toDateString();
                $e->props = json_decode((string) $e->props, true) ?: [];

                return $e;
            });
    }

    // Devices first seen in the last 30 days. Each step counts those that also did every step above it.
    private static function funnel(Collection $app): array
    {
        $left = $app->groupBy('device_id')->filter(fn ($g) => $g->first()->at >= now()->subDays(30));
        $steps = ['First opened' => $left->count()];
        foreach ([
            'Finished setup' => fn ($g) => $g->contains('name', 'setup_done'),
            'Added an expense' => fn ($g) => $g->contains('name', 'txn_added'),
            'Came back another day' => fn ($g) => $g->where('name', 'app_open')->pluck('day')->unique()->count() > 1,
        ] as $step => $did) {
            $steps[$step] = ($left = $left->filter($did))->count();
        }

        return $steps;
    }

    // Weekly cohorts by first-seen week (Monday start): the share active in each week after, up to 4.
    private static function retention(Collection $app): array
    {
        $cohorts = [];
        foreach ($app->groupBy('device_id') as $g) {
            $start = $g->first()->at->copy()->startOfWeek();
            $weeks = $g->map(fn ($e) => intdiv((int) $start->diffInDays($e->at->copy()->startOfWeek()), 7))->unique();
            $cohorts[$start->toDateString()][] = $weeks->all();
        }
        krsort($cohorts);

        return collect($cohorts)->take(8)->map(function ($devices, $week) {
            $elapsed = intdiv((int) Carbon::parse($week)->diffInDays(now()->startOfWeek()), 7);

            return [
                'size' => count($devices),
                'weeks' => collect(range(0, 4))->map(fn ($w) => $w > $elapsed ? null
                    : round(100 * collect($devices)->filter(fn ($weeks) => in_array($w, $weeks, true))->count() / count($devices)))->all(),
            ];
        })->all();
    }

    // Unique devices per screen and per action in the last 7 days, as a share of active devices.
    private static function reach(Collection $app, int $active): Collection
    {
        $week = $app->where('at', '>=', now()->subDays(7))->reject(fn ($e) => $e->name === 'app_open');

        return $week->groupBy(fn ($e) => $e->name === 'screen' ? 'Screen '.($e->props['path'] ?? '?') : $e->name)
            ->map(fn ($g) => ['devices' => $n = $g->pluck('device_id')->unique()->count(), 'share' => $active ? round(100 * $n / $active) : 0])
            ->sortByDesc('devices')->take(15);
    }
}
