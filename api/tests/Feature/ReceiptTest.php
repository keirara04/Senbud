<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class ReceiptTest extends TestCase
{
    private const DEVICE = '0b9c2a5e-7d1f-4c3a-9e8b-1f2d3c4b5a69';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.openrouter.key' => 'test-key', 'services.openrouter.model' => 'test/model']);
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

    public function test_never_logs_the_image(): void
    {
        Log::spy();
        Http::fake(['openrouter.ai/*' => Http::response('', 500)]);
        $this->send()->assertStatus(502);
        Log::shouldNotHaveReceived('error');
        Log::shouldNotHaveReceived('info');
    }
}
