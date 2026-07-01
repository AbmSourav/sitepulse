<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_reports', function (Blueprint $table) {
            // AI-generated summary + recommendations, persisted once (reports are
            // immutable). Shape: { summary, recommendations: [...], model, generated_at }.
            $table->json('ai_summary')->nullable()->after('themes');
        });
    }

    public function down(): void
    {
        Schema::table('audit_reports', function (Blueprint $table) {
            $table->dropColumn('ai_summary');
        });
    }
};
