<?php

namespace App\Http\Controllers;

use App\Support\OpenRouter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

// Reads a receipt photo with a vision model through OpenRouter and returns the line items.
// Privacy contract (App Store 5.1.2, the app's consent screen and the store data forms rely on it):
// the image is held in memory for this one request only. It is never written to disk, a queue,
// the database or a log, and OpenRouter is asked to route only to zero-data-retention endpoints.
class ReceiptController extends Controller
{
    // Must match Category in packages/core/src/index.ts.
    public const CATEGORIES = ['Food', 'Transport', 'Treat', 'Groceries', 'Subscription', 'Other'];

    // Amount caps are set in dollar-sized units. Currencies with many more units to the dollar scale them
    // up (about 1 USD = 16000 IDR, 25000 VND, 1400 KRW, 150 JPY, 85-280 INR, BDT, PKR), or real receipts get dropped.
    private const CAP_SCALE = ['IDR' => 10000, 'VND' => 10000, 'KRW' => 1000, 'JPY' => 100, 'PKR' => 100, 'INR' => 100, 'BDT' => 100];

    // A bigger amount than this in $currency is a misread or a typo, not a student's spending.
    public static function cap(?string $currency, int $base): int
    {
        return $base * (self::CAP_SCALE[strtoupper((string) $currency)] ?? 1);
    }

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

        if (! OpenRouter::ready()) {
            return response()->json(['error' => 'receipt_reading_unavailable'], 503);
        }

        $image = 'data:'.$mime.';base64,'.$data['image'];
        unset($bytes);

        $response = OpenRouter::chat([
            'messages' => [[
                'role' => 'user',
                'content' => [
                    ['type' => 'text', 'text' => $this->prompt($data['currency'] ?? null)],
                    ['type' => 'image_url', 'image_url' => ['url' => $image]],
                ],
            ]],
            'response_format' => ['type' => 'json_schema', 'json_schema' => self::schema()],
        ], 45);
        if (! $response) {
            return response()->json(['error' => 'receipt_reading_failed'], 502);
        }

        // Upstream errors are not echoed or logged in full: their bodies can quote the request. The
        // status alone tells a bad key (401) from no eligible endpoint (404) or a rate limit (429).
        if (! $response->successful()) {
            Log::warning('receipt upstream failed', ['status' => $response->status()]);

            return response()->json(['error' => 'receipt_reading_failed'], 502);
        }

        $parsed = json_decode((string) $response->json('choices.0.message.content'), true);
        if (! is_array($parsed)) {
            return response()->json(['error' => 'receipt_reading_failed'], 502);
        }

        return response()->json($this->clean($parsed, $data['currency'] ?? null));
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
    private function clean(array $r, ?string $hint): array
    {
        $str = fn ($v, $max) => is_string($v) && trim($v) !== '' ? mb_substr(trim($v), 0, $max) : null;
        $currency = $r['currency'] ?? null;
        $currency = is_string($currency) && preg_match('/^[A-Za-z]{3}$/', $currency) ? strtoupper($currency) : null;
        // The total becomes a pre-ticked "Service charge and tax" line in the app, so it gets the items' cap.
        $cap = self::cap($currency ?? $hint, 100000);
        $money = fn ($v) => is_numeric($v) && ($v = round((float) $v, 2)) > 0 && $v < $cap ? $v : null;

        $items = [];
        foreach (is_array($r['items'] ?? null) ? array_slice($r['items'], 0, 50) : [] as $item) {
            $amount = is_array($item) ? $money($item['amount'] ?? null) : null;
            $label = is_array($item) ? $str($item['label'] ?? null, 60) : null;
            if ($label === null || $amount === null) {
                continue;
            }
            $category = in_array($item['category'] ?? null, self::CATEGORIES, true) ? $item['category'] : 'Other';
            $items[] = ['label' => $label, 'amount' => $amount, 'category' => $category];
        }

        $date = $str($r['date'] ?? null, 10);

        return [
            'merchant' => $str($r['merchant'] ?? null, 80),
            'date' => $date && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? $date : null,
            'currency' => $currency,
            'items' => $items,
            'total' => $money($r['total'] ?? null),
        ];
    }
}
