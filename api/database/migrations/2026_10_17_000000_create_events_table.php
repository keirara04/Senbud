<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            // Made by the sender, so a retried batch is stored once.
            $table->uuid('client_id')->unique();
            // The app's anonymous device id (its Support ID). Null for landing-site page views.
            $table->uuid('device_id')->nullable();
            $table->string('platform', 8);
            $table->string('app_version', 16)->nullable();
            $table->string('name', 32);
            $table->json('props')->nullable();
            $table->timestamp('occurred_at');
            $table->index(['name', 'occurred_at']);
            $table->index(['device_id', 'occurred_at']);
            $table->index('occurred_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
