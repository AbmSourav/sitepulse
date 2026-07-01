<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        $settings = $request->user()->ai_settings ?? [];

        return Inertia::render('profile', [
            'status'     => $request->session()->get('status'),
            'aiSettings' => [
                'provider'  => $settings['provider'] ?? 'claude',
                'model'     => $settings['model'] ?? null,
                'hasApiKey' => ! empty($settings['apiKey']),
            ],
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validated();

        // Handle ai_settings separately: if the submitted apiKey is blank but one
        // is already stored, preserve the existing (encrypted) key so the user can
        // change the model without re-entering the key.
        $incoming = $validated['ai_settings'] ?? null;
        unset($validated['ai_settings']);

        $user->fill($validated);

        if (! is_null($incoming)) {
            $existing = $user->ai_settings ?? [];

            if (empty($incoming['apiKey']) && ! empty($existing['apiKey'])) {
                $incoming['apiKey'] = $existing['apiKey']; // already ciphertext
            }

            $user->ai_settings = ! empty($incoming['apiKey']) ? $incoming : null;
        }

        $user->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

        return to_route('profile.edit');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
