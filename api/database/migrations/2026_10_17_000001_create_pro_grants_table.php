<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Pro given by the owner from /admin, by Support ID (the app's anonymous device id).
        Schema::create('pro_grants', function (Blueprint $table) {
            $table->uuid('device_id')->primary();
            $table->timestamp('until')->nullable(); // null = no end
            $table->string('note', 120)->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pro_grants');
    }
};
