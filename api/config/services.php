<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    // Receipt reading. The key stays on this server; the app never sees it.
    'openrouter' => [
        'key' => env('OPENROUTER_API_KEY'),
        // Must have a zero-data-retention endpoint that supports response_format/structured_outputs, or
        // the provider settings in ReceiptController leave nowhere to route: see GET /api/v1/endpoints/zdr.
        'model' => env('OPENROUTER_MODEL', 'google/gemini-3.8-flash'),
        'url' => env('OPENROUTER_URL', 'https://openrouter.ai/api/v1/chat/completions'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
