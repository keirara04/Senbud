<?php

namespace App\Http\Controllers;

use App\Models\WaitlistSignup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WaitlistController extends Controller
{
    public const FEATURES = ['receipt', 'afford', 'split', 'subscriptions', 'wrapped'];

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:254'],
            'feature' => ['required', 'string', 'in:'.implode(',', self::FEATURES)],
        ]);

        // A repeat signup answers like a new one (200 vs 201) so the form never reveals who is
        // already on the list. createOrFirst survives two requests racing on the unique index.
        $signup = WaitlistSignup::createOrFirst(
            ['email' => Str::lower($data['email'])],
            ['feature' => $data['feature']],
        );

        return response()->json(['ok' => true], $signup->wasRecentlyCreated ? 201 : 200);
    }
}
