<?php

use App\Http\Controllers\AdminController;
use App\Http\Middleware\AdminGate;
use Illuminate\Support\Facades\Route;

Route::middleware(AdminGate::class)->prefix('admin')->group(function () {
    Route::get('/', [AdminController::class, 'index'])->name('admin');
    Route::get('/devices/{id?}', [AdminController::class, 'device'])->name('admin.device');
});
