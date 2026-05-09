<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->constrained()->cascadeOnDelete();
            $table->timestamp('started_at');
            $table->timestamp('resolved_at')->nullable();
            $table->string('reason')->nullable();
            $table->unsignedSmallInteger('http_status')->nullable();
            $table->timestamps();

            $table->index(['website_id', 'started_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_incidents');
    }
};
