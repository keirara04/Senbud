<?php

use App\Http\Controllers\WaitlistController;
use Illuminate\Support\Facades\Route;

Route::post('/waitlist', [WaitlistController::class, 'store'])->middleware('throttle:waitlist');
Route::get('/waitlist/confirm/{token}', [WaitlistController::class, 'confirm'])->middleware('throttle:30,1');
