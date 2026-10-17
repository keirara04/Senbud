<?php

namespace App\Http\Controllers;

use App\Support\OpenRouter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

// Wrapped captions: one short line per story page, written from numbers only. No labels, places or
// notes ever reach this endpoint (the "What gets sent" screen lists exactly what does), nothing is
// stored or logged, and OpenRouter routes only to zero-retention endpoints. The app falls back to its
// own rule-written captions whenever this fails.
class CaptionController extends Controller
{
    public const PAGES = ['spent', 'top', 'kept', 'treats', 'streak'];

    public function __invoke(Request $request): JsonResponse
    {
        $currency = $request->input('currency');
        $cap = ReceiptController::cap(is_string($currency) ? $currency : null, 100000000);
        $money = ['required', 'numeric', "between:0,$cap"];
        $data = $request->validate([
            'currency' => ['required', 'string', 'regex:/^[A-Za-z]{3}$/'],
            'span' => ['required', 'in:month,year'],
            'used' => ['required', 'numeric', 'between:0,100'],
            'top_category' => ['nullable', 'in:'.implode(',', ReceiptController::CATEGORIES)],
            'top_share' => ['required', 'numeric', 'between:0,1'],
            'kept' => $money,
            'over' => $money,
            'treats' => ['required', 'integer', 'between:0,10000'],
            'streak' => ['required', 'integer', 'between:0,366'],
        ]);
        if (! OpenRouter::ready()) {
            return response()->json(['error' => 'assistant_unavailable'], 503);
        }

        $response = OpenRouter::chat([
            'messages' => [['role' => 'system', 'content' => self::prompt($data)]],
            'response_format' => ['type' => 'json_schema', 'json_schema' => self::schema()],
            'max_tokens' => 250,
            'reasoning' => ['enabled' => false],
        ], 20, config('services.openrouter.ask_model'), ['sort' => 'latency']);
        if (! $response || ! $response->successful()) {
            Log::warning('caption upstream failed', ['status' => $response?->status()]);

            return response()->json(['error' => 'assistant_failed'], 502);
        }

        $reply = json_decode((string) $response->json('choices.0.message.content'), true);
        $captions = [];
        foreach (self::PAGES as $page) {
            $line = is_array($reply) && is_string($reply[$page] ?? null) ? trim(preg_replace(['/[*#`]+/', '/\s*—\s*/u'], ['', ', '], $reply[$page])) : '';
            if ($line === '') {
                return response()->json(['error' => 'assistant_failed'], 502);
            }
            $captions[$page] = mb_substr($line, 0, 90);
        }

        return response()->json(['captions' => $captions]);
    }

    private static function prompt(array $d): string
    {
        $pct = fn (float $n) => round($n * 100).'%';

        return 'You write captions for Senbud Wrapped, a student budgeting app\'s story of their '.$d['span'].'. '
            .'One caption per page, each under 12 words: warm, a little funny, never preachy or shaming, plain text, '
            .'no emoji, no em dashes, no numbers (the page already shows them). Never give financial advice. '
            .'Pages: spent (they used '.$pct($d['used']).' of their budget), '
            .'top (top category '.($d['top_category'] ?? 'none').', '.$pct($d['top_share']).' of spending), '
            .'kept ('.($d['over'] > 0 ? 'over budget by '.$d['over'] : 'kept '.$d['kept']).' '.strtoupper($d['currency']).'), '
            .'treats ('.$d['treats'].' treats), streak ('.$d['streak'].' days in a row within the daily budget).';
    }

    private static function schema(): array
    {
        return [
            'name' => 'wrapped_captions',
            'strict' => true,
            'schema' => [
                'type' => 'object',
                'additionalProperties' => false,
                'required' => self::PAGES,
                'properties' => array_fill_keys(self::PAGES, ['type' => 'string']),
            ],
        ];
    }
}
