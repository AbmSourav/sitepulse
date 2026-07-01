<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // BYOK Claude AI settings: { provider, apiKey (encrypted), model }.
            // Nullable — AI summaries are opt-in. See App\Casts\AiSettings.
            $table->json('ai_settings')->nullable()->after('subscription_detail');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('ai_settings');
        });
    }
};
