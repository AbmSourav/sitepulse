<?php

namespace App\Enums;

enum UptimeStatus: string
{
    case Up = 'up';
    case Down = 'down';
    case Unknown = 'unknown';
}
