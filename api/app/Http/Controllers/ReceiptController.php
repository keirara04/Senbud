<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

// Reads a receipt photo with a vision model through OpenRouter and returns the line items.
// Privacy contract (App Store 5.1.2, the app's consent screen and the store data forms rely on it):
// the image is held in memory for this one request only. It is never written to disk, a queue,
// the database or a log, and OpenRouter is asked to route only to zero-data-retention endpoints.
class ReceiptController extends Controller
{
    // Must match Category in packages/core/src/index.ts.
    public const CATEGORIES = ['Food', 'Transport', 'Treat', 'Groceries', 'Subscription', 'Other'];

    public function __invoke(Request $request): JsonResponse
    {
        // JSON with base64, not multipart: a multipart upload makes PHP write a temp file to disk.
        // The app resizes to ~1280px JPEG first; 5.5M base64 chars is about 4 MB of image.
        $data = $request->validate([
            'image' => ['required', 'string', 'max:5500000'],
            'currency' => ['nullable', 'string', 'regex:/^[A-Za-z]{3}$/'],
        ]);

        $bytes = base64_decode($data['image'], true);
        $mime = $bytes ? (new \finfo(FILEINFO_MIME_TYPE))->buffer($bytes) : null;
        if (! in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            return response()->json(['message' => 'The image must be a JPEG, PNG or WebP.', 'errors' => ['image' => ['invalid']]], 422);
        }

        $key = config('services.openrouter.key');
        if (! $key) {
            return response()->json(['error' => 'receipt_reading_unavailable'], 503);
        }

        $image = 'data:'.$mime.';base64,'.$data['image'];
        unset($bytes);

        try {
            $response = Http::withToken($key)
                ->timeout(45)
                ->acceptJson()
                ->post(config('services.openrouter.url'), [
                    'model' => config('services.openrouter.model'),
                    'messages' => [[
                        'role' => 'user',
                        'content' => [
                            ['type' => 'text', 'text' => $this->prompt($data['currency'] ?? null)],
                            ['type' => 'image_url', 'image_url' => ['url' => $image]],
                        ],
                    ]],
                    'response_format' => ['type' => 'json_schema', 'json_schema' => self::schema()],
                    'temperature' => 0,
                    'provider' => ['zdr' => true, 'data_collection' => 'deny', 'require_parameters' => true],
                ]);
        } catch (ConnectionException) {
            return response()->json(['error' => 'receipt_reading_failed'], 502);
        }

        // Upstream errors are not echoed: their bodies can quote the request.
        $parsed = $response->successful() ? json_decode((string) $response->json('choices.0.message.content'), true) : null;
        if (! is_array($parsed)) {
            return response()->json(['error' => 'receipt_reading_failed'], 502);
        }

        return response()->json($this->clean($parsed));
    }

    private function prompt(?string $currency): string
    {
        $hint = $currency ? ' The person usually pays in '.strtoupper($currency).'.' : '';

        return 'Read this shop receipt or payment screenshot.'.$hint.' Return the merchant name, the date '
            .'(YYYY-MM-DD) if printed, the ISO 4217 currency, and each purchased line item with its final '
            .'amount after any line discount, in major units (12.50, not 1250). Skip tax, tip, change and '
            .'payment lines unless they are the only thing charged. Pick each item\'s category from: '
            .implode(', ', self::CATEGORIES).'. "Treat" is coffee, bubble tea, snacks, desserts and other '
            .'small treats. If the image is not a receipt or is unreadable, return an empty items list.';
    }

    private static function schema(): array
    {
        $nullableString = ['type' => ['string', 'null']];

        return [
            'name' => 'receipt',
            'strict' => true,
            'schema' => [
                'type' => 'object',
                'additionalProperties' => false,
                'required' => ['merchant', 'date', 'currency', 'items', 'total'],
                'properties' => [
                    'merchant' => $nullableString,
                    'date' => $nullableString,
                    'currency' => $nullableString,
                    'total' => ['type' => ['number', 'null']],
                    'items' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'additionalProperties' => false,
                            'required' => ['label', 'amount', 'category'],
                            'properties' => [
                                'label' => ['type' => 'string'],
                                'amount' => ['type' => 'number'],
                                'category' => ['type' => 'string', 'enum' => self::CATEGORIES],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    // Models drift from schemas, and strict mode isn't enforced by every provider: never trust the
    // shape, and drop anything the app couldn't save.
    private function clean(array $r): array
    {
        $str = fn ($v, $max) => is_string($v) && trim($v) !== '' ? mb_substr(trim($v), 0, $max) : null;

        $items = [];
        foreach (is_array($r['items'] ?? null) ? array_slice($r['items'], 0, 50) : [] as $item) {
            $amount = is_array($item) && is_numeric($item['amount'] ?? null) ? round((float) $item['amount'], 2) : 0;
            $label = is_array($item) ? $str($item['label'] ?? null, 60) : null;
            if ($label === null || $amount <= 0 || $amount >= 100000) {
                continue;
            }
            $category = in_array($item['category'] ?? null, self::CATEGORIES, true) ? $item['category'] : 'Other';
            $items[] = ['label' => $label, 'amount' => $amount, 'category' => $category];
        }

        $date = $str($r['date'] ?? null, 10);
        $currency = $r['currency'] ?? null;

        return [
            'merchant' => $str($r['merchant'] ?? null, 80),
            'date' => $date && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? $date : null,
            'currency' => is_string($currency) && preg_match('/^[A-Za-z]{3}$/', $currency) ? strtoupper($currency) : null,
            'items' => $items,
            'total' => is_numeric($r['total'] ?? null) ? round((float) $r['total'], 2) : null,
        ];
    }
}
