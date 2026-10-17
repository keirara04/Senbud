<?php

namespace Tests\Feature;

use App\Providers\AppServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class ReceiptTest extends TestCase
{
    // The web allowance checks Pro grants (pro_grants).
    use RefreshDatabase;

    private const DEVICE = '0b9c2a5e-7d1f-4c3a-9e8b-1f2d3c4b5a69';

    protected function setUp(): void
    {
        parent::setUp();
        // Pinned so a local .env (e.g. one pointing at a stub server) can't send tests to a real host.
        config([
            'services.openrouter.key' => 'test-key',
            'services.openrouter.model' => 'test/model',
            'services.openrouter.url' => 'https://openrouter.ai/api/v1/chat/completions',
        ]);
        RateLimiter::clear('d:'.self::DEVICE);
    }

    /** A real 1x1 JPEG, base64. */
    private static function jpeg(): string
    {
        $img = imagecreatetruecolor(1, 1);
        ob_start();
        imagejpeg($img);

        return base64_encode(ob_get_clean());
    }

    private function send(array $body = [], array $headers = [])
    {
        return $this->postJson('/v1/agent/receipt', ['image' => self::jpeg(), 'currency' => 'myr', ...$body], ['X-Device-Id' => self::DEVICE, ...$headers]);
    }

    private static function fakeModel(array $content): void
    {
        Http::fake(['openrouter.ai/*' => Http::response(['choices' => [['message' => ['content' => json_encode($content)]]]])]);
    }

    public function test_reads_items_and_asks_openrouter_for_zero_retention_structured_output(): void
    {
        self::fakeModel([
            'merchant' => '7-Eleven',
            'date' => '2026-10-16',
            'currency' => 'myr',
            'items' => [
                ['label' => 'Milo can', 'amount' => 3.2, 'category' => 'Treat'],
                ['label' => 'Bread', 'amount' => 4.5, 'category' => 'Groceries'],
            ],
            'total' => 7.7,
        ]);

        $this->send()->assertOk()->assertExactJson([
            'merchant' => '7-Eleven',
            'date' => '2026-10-16',
            'currency' => 'MYR',
            'items' => [
                ['label' => 'Milo can', 'amount' => 3.2, 'category' => 'Treat'],
                ['label' => 'Bread', 'amount' => 4.5, 'category' => 'Groceries'],
            ],
            'total' => 7.7,
        ]);

        Http::assertSent(function (Request $r) {
            $content = $r['messages'][0]['content'];

            return $r->hasHeader('Authorization', 'Bearer test-key')
                && $r['model'] === 'test/model'
                && ! isset($r['temperature'])
                && $r['provider'] === ['zdr' => true, 'data_collection' => 'deny', 'require_parameters' => true]
                && $r['response_format']['type'] === 'json_schema'
                && $r['response_format']['json_schema']['strict'] === true
                && $content[0]['type'] === 'text' && str_contains($content[0]['text'], 'MYR')
                && str_starts_with($content[1]['image_url']['url'], 'data:image/jpeg;base64,');
        });
    }

    public function test_drops_items_the_app_could_not_save_and_fixes_bad_fields(): void
    {
        self::fakeModel([
            'merchant' => '  ',
            'date' => '16/10/2026',
            'currency' => 'ringgit',
            'items' => [
                ['label' => 'Nasi lemak', 'amount' => '6.5', 'category' => 'Breakfast'],
                ['label' => '', 'amount' => 3, 'category' => 'Food'],
                ['label' => 'Refund', 'amount' => -2, 'category' => 'Other'],
                'junk',
            ],
            'total' => 'n/a',
        ]);

        $this->send()->assertOk()->assertExactJson([
            'merchant' => null,
            'date' => null,
            'currency' => null,
            'items' => [['label' => 'Nasi lemak', 'amount' => 6.5, 'category' => 'Other']],
            'total' => null,
        ]);
    }

    public function test_rejects_anything_that_is_not_an_image(): void
    {
        Http::fake();
        $this->send(['image' => base64_encode('%PDF-1.7 not a photo')])->assertStatus(422);
        $this->send(['image' => 'not base64 at all!'])->assertStatus(422);
        $this->postJson('/v1/agent/receipt', [])->assertStatus(422)->assertJsonValidationErrors('image');
        Http::assertNothingSent();
    }

    public function test_upstream_failures_are_a_502_without_upstream_details(): void
    {
        Http::fake(['openrouter.ai/*' => Http::response(['error' => ['message' => 'secret upstream detail']], 500)]);
        $res = $this->send()->assertStatus(502)->assertExactJson(['error' => 'receipt_reading_failed']);
        $this->assertStringNotContainsString('secret', $res->getContent());

        self::fakeModel([]);
        Http::fake(['openrouter.ai/*' => Http::response(['choices' => [['message' => ['content' => 'not json']]]])]);
        $this->send()->assertStatus(502);
    }

    public function test_is_unavailable_without_a_key(): void
    {
        config(['services.openrouter.key' => null]);
        Http::fake();
        $this->send()->assertStatus(503)->assertExactJson(['error' => 'receipt_reading_unavailable']);
        Http::assertNothingSent();
    }

    public function test_rate_limits_each_device(): void
    {
        self::fakeModel(['merchant' => null, 'date' => null, 'currency' => null, 'items' => [], 'total' => null]);
        for ($i = 0; $i < 6; $i++) {
            $this->send()->assertOk();
        }
        $this->send()->assertStatus(429);
    }

    public function test_the_web_app_gets_a_small_free_daily_allowance(): void
    {
        config(['app.app_origin' => 'https://app.senbud.com', 'cors.allowed_origins' => ['https://senbud.com', 'https://app.senbud.com']]);
        self::fakeModel(['merchant' => null, 'date' => null, 'currency' => null, 'items' => [], 'total' => null]);
        $web = ['Origin' => 'https://app.senbud.com'];
        for ($i = 0; $i < AppServiceProvider::WEB_FREE_RECEIPTS; $i++) {
            $this->send([], $web)->assertOk()->assertHeader('Access-Control-Allow-Origin', 'https://app.senbud.com');
        }
        $limited = $this->send([], $web)->assertStatus(429);
        // A day-sized wait, so the app can say "more tomorrow" rather than "try again in a minute".
        $this->assertGreaterThan(3600, (int) $limited->headers->get('Retry-After'));
        // The phone app (no browser Origin) isn't held to the web allowance.
        $this->send()->assertOk();
    }

    public function test_the_unlimited_key_lifts_the_limits(): void
    {
        config(['app.unlimited_key' => 'owner-secret']);
        self::fakeModel(['merchant' => null, 'date' => null, 'currency' => null, 'items' => [], 'total' => null]);
        for ($i = 0; $i < 8; $i++) {
            $this->send([], ['Origin' => config('app.app_origin'), 'X-Unlimited-Key' => 'owner-secret'])->assertOk();
        }
    }

    public function test_the_device_id_or_a_wrong_or_unset_key_is_not_unlimited(): void
    {
        $empty = \Illuminate\Http\Request::create('/', 'POST', server: ['HTTP_X_UNLIMITED_KEY' => '']);
        $this->assertFalse(AppServiceProvider::unlimited($empty));

        config(['app.unlimited_key' => 'owner-secret']);
        self::fakeModel(['merchant' => null, 'date' => null, 'currency' => null, 'items' => [], 'total' => null]);
        foreach ([self::DEVICE, 'wrong', ''] as $key) {
            $this->send([], ['Origin' => config('app.app_origin'), 'X-Unlimited-Key' => $key])->assertOk();
        }
        $this->send([], ['Origin' => config('app.app_origin'), 'X-Unlimited-Key' => self::DEVICE])->assertStatus(429);
    }

    /** One model reply per call, in order (a second Http::fake wouldn't replace the first). */
    private static function fakeModels(array ...$contents): void
    {
        $seq = Http::fakeSequence('openrouter.ai/*');
        foreach ($contents as $content) {
            $seq->push(['choices' => [['message' => ['content' => json_encode($content)]]]]);
        }
    }

    public function test_total_gets_the_same_cap_as_items(): void
    {
        $receipt = fn ($total) => ['merchant' => null, 'date' => null, 'currency' => 'MYR', 'items' => [['label' => 'Tea', 'amount' => 3, 'category' => 'Treat']], 'total' => $total];
        self::fakeModels($receipt(99999999), $receipt(-5), $receipt(3.5));
        $this->send()->assertOk()->assertJsonPath('total', null);
        $this->send()->assertOk()->assertJsonPath('total', null);
        $this->send()->assertOk()->assertJsonPath('total', 3.5);
    }

    public function test_caps_scale_for_high_denomination_currencies(): void
    {
        // 250,000 rupiah is about 15 USD: kept. The same number in ringgit is a misread: dropped.
        $receipt = fn ($currency, $total = 275000) => ['merchant' => null, 'date' => null, 'currency' => $currency, 'items' => [['label' => 'Nasi padang', 'amount' => 250000, 'category' => 'Food']], 'total' => $total];
        self::fakeModels($receipt('IDR'), $receipt('MYR'), $receipt(null), $receipt('IDR', 1000000000));

        $this->send()->assertOk()->assertJsonPath('items.0.amount', 250000)->assertJsonPath('total', 275000);
        $this->send()->assertOk()->assertJsonPath('items', [])->assertJsonPath('total', null);
        // No currency read off the receipt: the app's currency decides.
        $this->send(['currency' => 'idr'])->assertOk()->assertJsonPath('items.0.amount', 250000);
        $this->send()->assertOk()->assertJsonPath('total', null);
    }

    public function test_cors_allows_the_web_app_and_its_device_id_header(): void
    {
        config(['cors.allowed_origins' => ['https://senbud.com', 'https://app.senbud.com']]);
        $this->call('OPTIONS', '/v1/agent/receipt', [], [], [], [
            'HTTP_ORIGIN' => 'https://app.senbud.com',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'content-type,x-device-id,x-unlimited-key',
        ])->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'https://app.senbud.com')
            ->assertHeader('Access-Control-Allow-Headers', 'content-type, accept, x-device-id, x-unlimited-key');
    }

    public function test_never_logs_the_image(): void
    {
        Log::spy();
        Http::fake(['openrouter.ai/*' => Http::response('', 500)]);
        $this->send()->assertStatus(502);
        Log::shouldNotHaveReceived('error');
        Log::shouldNotHaveReceived('info');
        Log::shouldHaveReceived('warning')->once()->with('receipt upstream failed', ['status' => 500]);
    }
}
