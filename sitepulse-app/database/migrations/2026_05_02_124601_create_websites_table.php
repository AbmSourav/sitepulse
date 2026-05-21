<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('websites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('url');
            $table->string('api_key')->nullable()->unique();
            $table->string('status')->default('active');
            $table->timestamp('connected_at')->nullable();

            $table->timestamp('last_checked_at')->nullable();
            $table->timestamp('next_check_at')->nullable();
            $table->unsignedTinyInteger('consecutive_failures')->default(0);
            $table->string('uptime_status')->default('unknown');

            $table->timestamp('last_audited_at')->nullable();
            $table->timestamp('next_audit_at')->nullable();

            $table->timestamps();

            $table->index(['team_id', 'user_id']);
            $table->index('next_check_at');
            $table->index('next_audit_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_reports');
        Schema::dropIfExists('site_incidents');
        Schema::dropIfExists('websites');
    }
};
