<?php

use App\Http\Controllers\AskController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\ReceiptController;
use App\Http\Controllers\WaitlistController;
use Illuminate\Support\Facades\Route;

Route::post('/waitlist', [WaitlistController::class, 'store'])->middleware('throttle:waitlist');
Route::get('/waitlist/confirm/{token}', [WaitlistController::class, 'confirm'])->middleware('throttle:30,1');

Route::post('/agent/receipt', ReceiptController::class)->middleware('throttle:receipt');
Route::post('/agent/ask', AskController::class)->middleware('throttle:ask');
Route::post('/events', EventController::class)->middleware('throttle:events');
