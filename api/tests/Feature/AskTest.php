<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class AskTest extends TestCase
{
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
    }

    private static function body(array $more = []): array
    {
        return [
            'question' => 'Where does my money go?',
            'currency' => 'myr',
            'summary' => [
                'period' => 'month',
                'days_left' => 12,
                'budget' => 1000,
                'spent' => 640.5,
                'left' => -20,
                'safe_today' => 0,
                'upcoming_bills' => 379.5,
                'by_category' => ['Food' => 400, 'Treat' => 240.5],
                'rent' => ['amount' => 350, 'due_day' => 1],
            ],
            'expenses' => [
                ['date' => '2026-10-15', 'label' => 'Kopi', 'amount' => 4.5, 'category' => 'Treat'],
                ['date' => '2026-10-14', 'label' => 'Nasi lemak', 'amount' => 6, 'category' => 'Food'],
            ],
            ...$more,
        ];
    }

    private function send(array $body)
    {
        return $this->postJson('/v1/agent/ask', $body, ['X-Device-Id' => self::DEVICE]);
    }

    private static function fakeAnswer(string $content): void
    {
        Http::fake(['openrouter.ai/*' => Http::response(['choices' => [['message' => ['content' => $content]]]])]);
    }

    public function test_answers_with_zero_retention_routing_and_only_the_promised_summary(): void
    {
        self::fakeAnswer("  Mostly **food**: RM 400 of RM 640.50.\n");

        $body = self::body(['history' => ['everything']]);
        $body['summary']['friends'] = ['Aiman'];
        $body['expenses'][0]['note'] = 'secret';

        $this->send($body)->assertOk()->assertExactJson(['answer' => 'Mostly food: RM 400 of RM 640.50.']);

        Http::assertSent(function (Request $r) {
            [$system, $user] = $r['messages'];

            return $r->hasHeader('Authorization', 'Bearer test-key')
                && $r['model'] === 'test/model'
                && ! isset($r['temperature'])
                && $r['provider'] === ['zdr' => true, 'data_collection' => 'deny', 'require_parameters' => true]
                && $system['role'] === 'system' && str_contains($system['content'], 'MYR')
                && str_contains($system['content'], '"Nasi lemak"') && str_contains($system['content'], '"due_day":1')
                && ! str_contains($system['content'], 'Aiman') && ! str_contains($system['content'], 'secret')
                && ! str_contains($system['content'], 'everything')
                && $user === ['role' => 'user', 'content' => 'Where does my money go?'];
        });
    }

    public function test_rejects_more_than_the_summary_allows(): void
    {
        Http::fake();
        $expense = ['date' => '2026-10-15', 'label' => 'Kopi', 'amount' => 4.5, 'category' => 'Treat'];
        $this->send(self::body(['expenses' => array_fill(0, 21, $expense)]))->assertStatus(422)->assertJsonValidationErrors('expenses');
        $this->send(self::body(['question' => str_repeat('a', 501)]))->assertStatus(422)->assertJsonValidationErrors('question');
        $body = self::body();
        $body['summary']['by_category']['Rent'] = 350;
        $this->send($body)->assertStatus(422);
        $this->postJson('/v1/agent/ask', [])->assertStatus(422)->assertJsonValidationErrors(['question', 'summary', 'expenses']);
        Http::assertNothingSent();
    }

    public function test_no_rent_and_no_expenses_is_fine(): void
    {
        self::fakeAnswer('Nothing spent yet.');
        $this->send(self::body(['expenses' => [], 'summary' => [...self::body()['summary'], 'rent' => null, 'by_category' => []]]))
            ->assertOk()->assertExactJson(['answer' => 'Nothing spent yet.']);
    }

    public function test_upstream_failures_are_a_502_without_upstream_details(): void
    {
        Http::fake(['openrouter.ai/*' => Http::response(['error' => ['message' => 'secret upstream detail']], 500)]);
        $res = $this->send(self::body())->assertStatus(502)->assertExactJson(['error' => 'assistant_failed']);
        $this->assertStringNotContainsString('secret', $res->getContent());

        self::fakeAnswer('   ');
        $this->send(self::body())->assertStatus(502);
    }

    public function test_is_unavailable_without_a_key(): void
    {
        config(['services.openrouter.key' => null]);
        Http::fake();
        $this->send(self::body())->assertStatus(503)->assertExactJson(['error' => 'assistant_unavailable']);
        Http::assertNothingSent();
    }

    public function test_rate_limits_each_device(): void
    {
        self::fakeAnswer('Ok.');
        for ($i = 0; $i < 10; $i++) {
            $this->send(self::body())->assertOk();
        }
        $this->send(self::body())->assertStatus(429);
    }

    public function test_never_logs_the_question(): void
    {
        Log::spy();
        Http::fake(['openrouter.ai/*' => Http::response('', 500)]);
        $this->send(self::body())->assertStatus(502);
        Log::shouldNotHaveReceived('error');
        Log::shouldNotHaveReceived('info');
        Log::shouldHaveReceived('warning')->once()->with('ask upstream failed', ['status' => 500]);
    }
}
