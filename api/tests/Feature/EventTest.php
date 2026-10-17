<?php

namespace Tests\Feature;

use App\Support\OpenRouter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class EventTest extends TestCase
{
    use RefreshDatabase;

    private const DEVICE = '0b9c2a5e-7d1f-4c3a-9e8b-1f2d3c4b5a69';

    private static function event(array $more = []): array
    {
        return ['id' => (string) Str::uuid(), 'name' => 'app_open', 'at' => now()->toIso8601String(), ...$more];
    }

    private function send(array $events, string $platform = 'ios', array $headers = ['X-Device-Id' => self::DEVICE])
    {
        return $this->postJson('/v1/events', ['platform' => $platform, 'app_version' => '1.2.0', 'events' => $events], $headers);
    }

    public function test_stores_a_batch_once_even_when_retried(): void
    {
        $batch = [self::event(), self::event(['name' => 'txn_added', 'props' => ['source' => 'receipt']])];

        $this->send($batch)->assertStatus(202);
        $this->send($batch)->assertStatus(202);

        $this->assertSame(2, DB::table('events')->count());
        $row = DB::table('events')->where('name', 'txn_added')->first();
        $this->assertSame(self::DEVICE, $row->device_id);
        $this->assertSame('ios', $row->platform);
        $this->assertSame(['source' => 'receipt'], json_decode($row->props, true));
    }

    public function test_rejects_unknown_names_big_batches_and_rich_props(): void
    {
        $this->send([self::event(['name' => 'drop_table'])])->assertStatus(422);
        $this->send(array_fill(0, 51, self::event()))->assertStatus(422);
        $this->send([self::event(['props' => ['label' => str_repeat('x', 101)]])])->assertStatus(422);
        $this->send([self::event(['props' => ['nested' => ['amount' => 12]]])])->assertStatus(422);
        $this->send([self::event()], 'server')->assertStatus(422);
        $this->assertSame(0, DB::table('events')->count());
    }

    public function test_app_events_need_a_device_id_and_site_views_have_none(): void
    {
        $this->send([self::event()], 'ios', [])->assertStatus(422);
        $this->send([self::event()], 'site', [])->assertStatus(422);

        $this->send([self::event(['name' => 'page_view', 'props' => ['path' => '/']])], 'site', ['X-Device-Id' => self::DEVICE])->assertStatus(202);
        $this->assertNull(DB::table('events')->value('device_id'));
    }

    public function test_future_times_are_clamped_to_now(): void
    {
        $this->send([self::event(['at' => now()->addYear()->toIso8601String()])])->assertStatus(202);

        $this->assertTrue(now()->addMinute()->greaterThan(DB::table('events')->value('occurred_at')));
    }

    public function test_admin_is_off_without_a_password_and_locked_with_one(): void
    {
        config(['app.admin_password' => '']);
        $this->get('/admin')->assertNotFound();

        config(['app.admin_password' => 'secret']);
        $this->get('/admin')->assertStatus(401)->assertHeader('WWW-Authenticate');
        $this->withBasicAuth('me', 'wrong')->get('/admin')->assertStatus(401);
    }

    public function test_admin_shows_actives_and_a_device_timeline(): void
    {
        config(['app.admin_password' => 'secret']);
        $this->send([self::event(), self::event(['name' => 'treat_added'])])->assertStatus(202);

        $this->withBasicAuth('me', 'secret')->get('/admin')->assertOk()->assertSee('Active devices')->assertSee('treat_added');
        $this->withBasicAuth('me', 'secret')->get('/admin/devices?id='.strtoupper(self::DEVICE))->assertRedirect('/admin/devices/'.self::DEVICE);
        $this->withBasicAuth('me', 'secret')->get('/admin/devices/'.self::DEVICE)->assertOk()->assertSee('treat_added')->assertSee('iOS, version 1.2.0');
        $this->withBasicAuth('me', 'secret')->get('/admin/devices?id=0b9c2a5e')->assertRedirect('/admin/devices/'.self::DEVICE);
        $this->withBasicAuth('me', 'secret')->get('/admin/devices/nope')->assertNotFound();
    }

    public function test_each_ai_call_records_its_usage_and_nothing_else(): void
    {
        config(['services.openrouter.key' => 'test-key', 'services.openrouter.url' => 'https://openrouter.ai/api/v1/chat/completions']);
        Http::fake(['*' => Http::response(['choices' => [['message' => ['content' => 'secret answer']]], 'usage' => ['prompt_tokens' => 120, 'completion_tokens' => 30, 'cost' => 0.0004]])]);

        OpenRouter::chat(['messages' => [['role' => 'user', 'content' => 'secret question']]], 5);

        $row = DB::table('events')->first();
        $this->assertSame('server', $row->platform);
        $this->assertSame(['status' => 200, 'tokens_in' => 120, 'tokens_out' => 30, 'cost' => 0.0004], json_decode($row->props, true));
        $this->assertStringNotContainsString('secret', $row->props);
    }
}
