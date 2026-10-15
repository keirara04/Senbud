<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('waitlist_signups', function (Blueprint $table) {
            // sha256 of the emailed token; the token itself is never stored.
            $table->char('confirm_token', 64)->nullable()->unique();
            $table->timestamp('confirm_token_created_at')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->string('referral_code', 8)->nullable()->unique();
            $table->foreignId('referred_by')->nullable()->constrained('waitlist_signups')->nullOnDelete();
            $table->unsignedInteger('referrals_count')->default(0);
        });

        // Rows from before double opt-in stay unconfirmed but still get a code.
        DB::table('waitlist_signups')->whereNull('referral_code')->pluck('id')
            ->each(fn ($id) => DB::table('waitlist_signups')->where('id', $id)->update(['referral_code' => Str::random(8)]));
    }

    public function down(): void
    {
        Schema::table('waitlist_signups', function (Blueprint $table) {
            $table->dropConstrainedForeignId('referred_by');
            $table->dropUnique(['confirm_token']);
            $table->dropUnique(['referral_code']);
            $table->dropColumn(['confirm_token', 'confirm_token_created_at', 'confirmed_at', 'referral_code', 'referrals_count']);
        });
    }
};
