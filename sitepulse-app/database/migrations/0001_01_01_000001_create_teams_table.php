<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->boolean('is_personal')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('team_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('user_id');
            $table->string('role');
            $table->timestamps();

            $table->unique(['team_id', 'user_id']);
        });

        Schema::create('team_invitations', function (Blueprint $table) {
            $table->id();
            $table->string('code', 64)->unique();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('email');
            $table->string('role');
            $table->unsignedBigInteger('invited_by');
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
        });

        // Add cross-table FKs now that both users and teams tables exist
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
        });

        Schema::table('team_members', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::table('team_invitations', function (Blueprint $table) {
            $table->foreign('invited_by')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['team_id']);
        });

        Schema::dropIfExists('team_invitations');
        Schema::dropIfExists('team_members');
        Schema::dropIfExists('teams');
    }
};
