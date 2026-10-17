<?php

namespace App\Support;

use App\Http\Controllers\EventController;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

// The one way the API talks to a model. Every call is routed only to zero-data-retention endpoints;
// the app's consent copy and the store data forms rely on that.
class OpenRouter
{
    public static function ready(): bool
    {
        return (bool) config('services.openrouter.key');
    }

    /** Null when OpenRouter can't be reached. $provider adds routing options, e.g. sort by latency. */
    public static function chat(array $body, int $timeout, ?string $model = null, array $provider = []): ?Response
    {
        try {
            $response = Http::withToken(config('services.openrouter.key'))
                ->timeout($timeout)
                ->acceptJson()
                ->post(config('services.openrouter.url'), [
                    'model' => $model ?? config('services.openrouter.model'),
                    ...$body,
                    // No temperature: require_parameters drops any endpoint that doesn't support every
                    // parameter sent, and the ZDR Gemini Flash endpoints don't list temperature.
                    'provider' => ['zdr' => true, 'data_collection' => 'deny', 'require_parameters' => true, ...$provider],
                ]);
        } catch (ConnectionException) {
            $response = null;
        }
        self::record($response);

        return $response;
    }

    // One usage row per call for the admin page's AI cost card. Counts only, never the prompt or reply.
    private static function record(?Response $response): void
    {
        try {
            EventController::server(request(), 'ai_'.basename(request()->path()), [
                'status' => $response?->status() ?? 0,
                'tokens_in' => (int) $response?->json('usage.prompt_tokens'),
                'tokens_out' => (int) $response?->json('usage.completion_tokens'),
                'cost' => (float) $response?->json('usage.cost'),
            ]);
        } catch (\Throwable) {
            // Analytics never costs someone their answer.
        }
    }
}
