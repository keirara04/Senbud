<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CaptionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.openrouter.key' => 'test-key',
            'services.openrouter.ask_model' => 'test/ask-model',
            'services.openrouter.url' => 'https://openrouter.ai/api/v1/chat/completions',
        ]);
    }

    private static function body(array $more = []): array
    {
        return ['currency' => 'myr', 'span' => 'year', 'used' => 0.82, 'top_category' => 'Food', 'top_share' => 0.41, 'kept' => 1200, 'over' => 0, 'treats' => 37, 'streak' => 12, ...$more];
    }

    private static function fake(array $captions): void
    {
        Http::fake(['openrouter.ai/*' => Http::response(['choices' => [['message' => ['content' => json_encode($captions)]]]])]);
    }

    public function test_writes_one_clean_line_per_page_from_numbers_only(): void
    {
        self::fake(['spent' => 'Steady **hands** — all year.', 'top' => 'Food ruled.', 'kept' => 'Jar money.', 'treats' => 'Earned.', 'streak' => 'On a roll.']);

        $this->postJson('/v1/agent/caption', [...self::body(), 'top_place' => 'Secret Cafe'], ['X-Device-Id' => 'd1'])
            ->assertOk()
            ->assertJsonPath('captions.spent', 'Steady hands, all year.')
            ->assertJsonPath('captions.streak', 'On a roll.');

        Http::assertSent(fn (Request $r) => str_contains($r['messages'][0]['content'], 'top category Food, 41%')
            && ! str_contains($r['messages'][0]['content'], 'Secret Cafe'));
    }

    public function test_a_missing_page_is_a_502_so_the_app_uses_its_own(): void
    {
        self::fake(['spent' => 'Fine.']);

        $this->postJson('/v1/agent/caption', self::body(), ['X-Device-Id' => 'd1'])->assertStatus(502);
    }

    public function test_rejects_labels_dressed_as_categories(): void
    {
        $this->postJson('/v1/agent/caption', self::body(['top_category' => 'Secret Cafe']), ['X-Device-Id' => 'd1'])->assertStatus(422);
    }
}
