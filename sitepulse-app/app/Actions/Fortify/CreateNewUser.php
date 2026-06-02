<?php

namespace App\Actions\Fortify;

use App\Actions\Teams\CreateTeam;
use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Enums\Plan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    public function __construct(private CreateTeam $createTeam)
    {
        //
    }

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'email'    => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => $this->passwordRules(),
        ], [
            'email.unique' => 'Wrong credentials for creating account.',
        ])->validate();

        return $this->storeUserAndTeam([
            'name'                => $input['name'],
            'email'               => $input['email'],
            'password'            => $input['password'] ?? null,
            'subscription_detail' => [
                'plan'   => Plan::Free->value,
                'label'  => Plan::Free->label(),
                'limits' => Plan::Free->limits(),
            ],
        ]);
    }

    public function storeUserAndTeam(array $input): User
    {
        return DB::transaction(function () use ($input) {
            $user = User::create($input);

            $this->createTeam->handle($user, $user->name."'s Team", isPersonal: true);

            return $user;
        });
    }
}
