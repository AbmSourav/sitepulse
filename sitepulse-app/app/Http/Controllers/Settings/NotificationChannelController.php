<?php

namespace App\Http\Controllers\Settings;

use App\Enums\NotificationChannelType;
use App\Http\Controllers\Controller;
use App\Models\NotificationChannel;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationChannelController extends Controller
{
    public function index(Request $request): Response
    {
        $teamId = $request->user()->team_id;

        $channels = NotificationChannel::where('team_id', $teamId)
            ->orderBy('created_at')
            ->get()
            ->map(fn ($ch) => [
                'id'        => $ch->id,
                'type'      => $ch->type->value,
                'name'      => $ch->name,
                'config'    => $ch->config,
                'is_active' => $ch->is_active,
            ]);

        $allowedChannels = $request->user()->planLimits()['notificationChannels'];

        $availableTypes = array_map(fn (NotificationChannelType $type) => [
            'value'         => $type->value,
            'label'         => $type->label(),
            'description'   => $type->description(),
            'config_fields' => $type->configFields(),
            'allowed'       => in_array($type->value, $allowedChannels, true),
        ], NotificationChannelType::cases());

        return Inertia::render('notifications', [
            'channels'       => $channels,
            'availableTypes' => $availableTypes,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'type'   => ['required', 'string'],
            'name'   => ['required', 'string', 'max:255'],
            'config' => ['required', 'array'],
        ]);

        $type = NotificationChannelType::from($data['type']);

        $this->validateConfig($type, $data['config']);

        NotificationChannel::create([
            'team_id' => $request->user()->team_id,
            'type'    => $type->value,
            'name'    => $data['name'],
            'config'  => $data['config'],
        ]);

        return back();
    }

    public function update(Request $request, NotificationChannel $channel): RedirectResponse
    {
        abort_if($channel->team_id !== $request->user()->team_id, 403);

        $data = $request->validate([
            'name'      => ['sometimes', 'string', 'max:255'],
            'config'    => ['sometimes', 'array'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['config'])) {
            $this->validateConfig($channel->type, $data['config']);
        }

        $channel->update($data);

        return back();
    }

    public function destroy(Request $request, NotificationChannel $channel): RedirectResponse
    {
        abort_if($channel->team_id !== $request->user()->team_id, 403);

        $channel->delete();

        return back();
    }

    private function validateConfig(NotificationChannelType $type, array $config): void
    {
        $required = array_filter($type->configFields(), fn ($f) => $f !== 'secret');

        foreach ($required as $field) {
            abort_if(empty($config[$field]), 422, "Missing required config field: {$field}");
        }
    }
}
