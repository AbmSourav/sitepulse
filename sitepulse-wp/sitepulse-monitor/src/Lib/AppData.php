<?php

namespace Sitepulse\SitepulseMonitor\Lib;

class AppData
{
    public static function get(string $key): mixed
    {
        $appData = get_option('spm_app', false);
        return $appData[$key] ?? false;
    }

    public static function getAll(): array
    {
        return get_option('spm_app', []);
    }

    public static function set(mixed $value, string $key = ''): void
    {
        $appData = get_option('spm_app', false);
        if (!$appData) {
            $appData = [];
        }

        if (is_array($value)) {
            $appData = [...$appData, ...$value];
        } else {
            $appData[$key] = $value;
        }

        update_option('spm_app', $appData);
    }
}
