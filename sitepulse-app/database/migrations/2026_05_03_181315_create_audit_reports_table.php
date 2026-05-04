<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->constrained()->cascadeOnDelete();
            $table->timestamp('audited_at');

            $table->json('health')->nullable();    // status, wp/php/mysql versions, cron, debug_mode, admin_email, locale
            $table->json('server')->nullable();   // db_size_bytes, php_error_count, php_errors sample
            $table->json('security')->nullable(); // ssl_valid, ssl_expires_at, vulnerable_plugins_count
            $table->json('plugins')->nullable();  // total, outdated, vulnerable counts + items list
            $table->json('themes')->nullable();   // total, outdated counts + active theme + items list

            $table->timestamps();

            $table->index(['website_id', 'audited_at'], 'idx_audit_website_time');
            $table->index('audited_at', 'idx_audit_time');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_reports');
    }
};
