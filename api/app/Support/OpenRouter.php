<?php

namespace App\Support;

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
            return Http::withToken(config('services.openrouter.key'))
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
            return null;
        }
    }
}
