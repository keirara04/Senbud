<?php

namespace Tests\Feature;

use App\Models\WaitlistSignup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    private const A = 'aaaaaaaa-0000-4000-8000-000000000001';

    private const B = 'bbbbbbbb-0000-4000-8000-000000000002';

    private const C = 'cccccccc-0000-4000-8000-000000000003';

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-10-14 12:00:00'); // a Wednesday
        config(['app.admin_password' => 'secret']);
    }

    private static function event(string $device, string $name, string $at, array $props = [], string $version = '1.0.0'): void
    {
        DB::table('events')->insert([
            'client_id' => (string) Str::uuid(), 'device_id' => $device, 'platform' => 'ios', 'app_version' => $version,
            'name' => $name, 'props' => $props ? json_encode($props) : null, 'occurred_at' => $at,
        ]);
    }

    private function admin()
    {
        return $this->withBasicAuth('me', 'secret');
    }

    public function test_funnel_retention_reach_and_pro(): void
    {
        // A: new this week, does everything, comes back the next day, buys Pro.
        self::event(self::A, 'app_open', '2026-10-12 09:00:00');
        self::event(self::A, 'setup_done', '2026-10-12 09:05:00');
        self::event(self::A, 'txn_added', '2026-10-12 09:10:00');
        self::event(self::A, 'app_open', '2026-10-13 09:00:00');
        self::event(self::A, 'screen', '2026-10-13 09:01:00', ['path' => '/pro']);
        self::event(self::A, 'pro_bought', '2026-10-13 09:02:00');
        // B: new this week, opens once on an old version.
        self::event(self::B, 'app_open', '2026-10-13 10:00:00', [], '0.9.0');
        // C: first seen two weeks ago, back in week 1, gone in week 2.
        self::event(self::C, 'app_open', '2026-09-28 10:00:00');
        self::event(self::C, 'app_open', '2026-10-06 10:00:00');

        $res = $this->admin()->get('/admin')->assertOk()->assertSee('Weekly retention');

        $this->assertSame(['First opened' => 3, 'Finished setup' => 1, 'Added an expense' => 1, 'Came back another day' => 1], $res->viewData('funnel'));
        $this->assertSame([
            '2026-10-12' => ['size' => 2, 'weeks' => [100.0, null, null, null, null]],
            '2026-09-28' => ['size' => 1, 'weeks' => [100.0, 100.0, 0.0, null, null]],
        ], $res->viewData('retention'));
        $this->assertSame(['devices' => 1, 'share' => 50.0], $res->viewData('reach')['Screen /pro']);
        $this->assertArrayNotHasKey('app_open', $res->viewData('reach')->all());
        $this->assertSame(['ios 1.0.0' => 1, 'ios 0.9.0' => 1], $res->viewData('versions')->all());
        $this->assertSame(['paywall' => 1, 'bought' => 1], $res->viewData('pro'));
    }

    // Cross-site posts are refused by the framework's PreventRequestForgery, which skips itself in tests.
    public function test_device_data_can_be_deleted(): void
    {
        self::event(self::A, 'app_open', '2026-10-13 09:00:00');
        self::event(self::B, 'app_open', '2026-10-13 09:00:00');

        $this->admin()->post('/admin/devices/'.self::A.'/delete')->assertRedirect('/admin/devices/'.self::A);
        $this->assertSame([self::B], DB::table('events')->pluck('device_id')->all());
    }

    public function test_waitlist_page_csv_and_removal(): void
    {
        $make = fn (string $email, ?string $confirmed, int $refs = 0, ?int $by = null) => WaitlistSignup::forceCreate([
            'email' => $email, 'feature' => 'receipts', 'referral_code' => Str::random(8), 'referred_by' => $by,
            'referrals_count' => $refs, 'confirmed_at' => $confirmed,
        ]);
        $early = $make('early@example.com', '2026-10-01 10:00:00');
        $friendly = $make('=cmd()@example.com', '2026-10-05 10:00:00', 2);
        $make('friend@example.com', '2026-10-06 10:00:00', 0, $friendly->id);
        $make('pending@example.com', null);

        $this->admin()->get('/admin/waitlist')->assertOk()->assertSeeInOrder(['=cmd()@example.com', 'early@example.com', 'friend@example.com', 'pending@example.com']);
        $this->admin()->get('/admin/waitlist?q=PEND')->assertOk()->assertSee('pending@example.com')->assertDontSee('early@example.com');

        $csv = $this->admin()->get('/admin/waitlist.csv')->assertOk()->assertHeader('Content-Type', 'text/csv; charset=utf-8')->getContent();
        $lines = explode("\n", trim($csv));
        $this->assertCount(4, $lines); // header + 3 confirmed, no pending
        $this->assertStringStartsWith('1,"\'=cmd()@example.com"', $lines[1]); // formula defused
        $this->assertStringStartsWith('2,"early@example.com"', $lines[2]);

        $this->admin()->post('/admin/waitlist/'.$friendly->id.'/delete')->assertRedirect('/admin/waitlist');
        $this->assertNull(WaitlistSignup::find($friendly->id));
        $this->assertNull(WaitlistSignup::where('email', 'friend@example.com')->value('referred_by'));
        $this->assertNotNull(WaitlistSignup::find($early->id));
    }

    public function test_new_pages_need_the_password(): void
    {
        foreach (['/admin/waitlist', '/admin/waitlist.csv'] as $url) {
            $this->get($url)->assertUnauthorized();
        }
        $this->post('/admin/waitlist/1/delete')->assertUnauthorized();
        $this->post('/admin/devices/'.self::A.'/pro', ['months' => '12'])->assertUnauthorized();
        $this->post('/admin/devices/'.self::A.'/pro/revoke')->assertUnauthorized();
        $this->assertSame(0, DB::table('pro_grants')->count());
    }

    public function test_pro_can_be_granted_and_revoked_by_support_id(): void
    {
        $pro = fn () => $this->getJson('/v1/pro', ['X-Device-Id' => strtoupper(self::A)])->assertOk()->json();
        $this->assertSame(['pro' => false, 'until' => null], $pro());

        $this->admin()->post('/admin/devices/'.self::A.'/pro', ['months' => '12', 'note' => 'Beta tester'])->assertRedirect('/admin/devices/'.self::A);
        $this->assertSame(['pro' => true, 'until' => '2027-10-14T12:00:00+00:00'], $pro());
        $this->admin()->get('/admin/devices/'.self::A)->assertSee('until 14 Oct 2027')->assertSee('Beta tester');
        $this->admin()->get('/admin')->assertSee('Beta tester');

        // Granting again replaces the grant; no end date means until stays null.
        $this->admin()->post('/admin/devices/'.self::A.'/pro', ['months' => '0'])->assertRedirect();
        $this->assertSame(['pro' => true, 'until' => null], $pro());
        $this->assertSame(1, DB::table('pro_grants')->count());

        $this->admin()->post('/admin/devices/'.self::A.'/pro/revoke')->assertRedirect();
        $this->assertSame(['pro' => false, 'until' => null], $pro());

        $this->admin()->post('/admin/devices/'.self::A.'/pro', ['months' => '6'])->assertStatus(422);
    }

    public function test_a_grant_ends_and_lifts_the_web_allowance_while_it_lasts(): void
    {
        DB::table('pro_grants')->insert(['device_id' => self::A, 'until' => now()->addDay(), 'created_at' => now()]);
        $limits = function (string $device) {
            $request = Request::create('/v1/agent/receipt', 'POST', server: ['HTTP_ORIGIN' => config('app.app_origin'), 'HTTP_X_DEVICE_ID' => $device]);

            return count(Arr::wrap(RateLimiter::limiter('receipt')($request)));
        };

        $this->assertSame(3, $limits(self::A)); // the app's caps only
        $this->assertSame(5, $limits(self::B)); // plus the two web allowance caps

        Carbon::setTestNow(now()->addDays(2));
        $this->assertSame(5, $limits(self::A));
        $this->getJson('/v1/pro', ['X-Device-Id' => self::A])->assertJson(['pro' => false]);
    }
}
