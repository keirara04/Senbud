<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Pro granted by the owner from /admin, for the device in X-Device-Id. The app adds it to what
// RevenueCat says (mobile/src/purchases.ts syncGrant). The Support ID is shown in Settings and pasted
// into support chats, so someone who copies another person's ID onto their own device could use their
// grant: fine for gifts, not for anything that has to be paid for.
class ProController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $grant = self::grant($request->header('X-Device-Id'));

        return response()->json(['pro' => (bool) $grant, 'until' => $grant?->until ? Carbon::parse($grant->until)->toIso8601String() : null]);
    }

    /** The device's grant while it lasts, else null. */
    public static function grant(mixed $deviceId): ?object
    {
        if (! is_string($deviceId) || ! Str::isUuid($deviceId)) {
            return null;
        }

        return DB::table('pro_grants')->where('device_id', strtolower($deviceId))
            ->where(fn ($q) => $q->whereNull('until')->orWhere('until', '>', now()))->first();
    }
}
