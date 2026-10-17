<?php

use App\Http\Controllers\AdminController;
use App\Http\Middleware\AdminGate;
use Illuminate\Support\Facades\Route;

// Posts need no CSRF token: the web group's PreventRequestForgery accepts a browser's
// Sec-Fetch-Site: same-origin, which a cross-site form can't fake. Sessions are per-request (array).
Route::middleware(AdminGate::class)->prefix('admin')->group(function () {
    Route::get('/', [AdminController::class, 'index'])->name('admin');
    Route::get('/devices/{id?}', [AdminController::class, 'device'])->name('admin.device');
    Route::post('/devices/{id}/delete', [AdminController::class, 'deleteDevice'])->name('admin.device.delete');
    Route::get('/waitlist', [AdminController::class, 'waitlist'])->name('admin.waitlist');
    Route::get('/waitlist.csv', [AdminController::class, 'waitlistCsv'])->name('admin.waitlist.csv');
    Route::post('/waitlist/{id}/delete', [AdminController::class, 'deleteSignup'])->name('admin.waitlist.delete');
});
