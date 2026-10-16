<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // The landing page's waitlist forms ask for an email only, so the feature pick is optional.
    public function up(): void
    {
        Schema::table('waitlist_signups', function (Blueprint $table) {
            $table->string('feature', 32)->nullable()->change();
        });
    }

    public function down(): void
    {
        // The old column can't hold "no answer", so those rows fall back to the old default.
        DB::table('waitlist_signups')->whereNull('feature')->update(['feature' => 'receipt']);
        Schema::table('waitlist_signups', function (Blueprint $table) {
            $table->string('feature', 32)->nullable(false)->change();
        });
    }
};
