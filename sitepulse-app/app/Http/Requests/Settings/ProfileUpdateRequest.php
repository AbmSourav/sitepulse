<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules(),   // name (shared with registration)

            // BYOK Claude AI settings. Kept here (not in the shared concern) so
            // registration's profileRules() stays clean of AI fields.
            'ai_settings'          => ['nullable', 'array'],
            'ai_settings.provider' => ['required_with:ai_settings', 'nullable', Rule::in(['claude'])],
            'ai_settings.apiKey'   => ['nullable', 'string', 'max:255'],
            'ai_settings.model'    => [
                'required_with:ai_settings.apiKey',
                'nullable',
                Rule::in(config('services.anthropic.models')),
            ],
        ];
    }
}
