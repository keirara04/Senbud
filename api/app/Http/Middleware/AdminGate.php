<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// HTTP Basic with ADMIN_PASSWORD (any username) for /admin. Unset = the pages don't exist.
class AdminGate
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = (string) config('app.admin_password');
        if ($key === '') {
            abort(404);
        }
        if (! hash_equals($key, (string) $request->getPassword())) {
            return response('Senbud admin', 401, ['WWW-Authenticate' => 'Basic realm="Senbud admin"']);
        }

        return $next($request);
    }
}
