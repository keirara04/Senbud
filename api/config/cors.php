<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['v1/*'],

    'allowed_methods' => ['GET', 'POST'],

    // Exact origin, port included, no trailing slash.
    'allowed_origins' => [env('WEB_ORIGIN', 'http://localhost:3000'), env('APP_ORIGIN', 'http://localhost:8081')],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Accept', 'X-Device-Id', 'X-Unlimited-Key'],

    // So the web app can tell "try again in a minute" from "that's today's free allowance".
    'exposed_headers' => ['Retry-After'],

    'max_age' => 0,

    'supports_credentials' => false,

];
