<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('sites:check-due')
    // ->everyMinute()
    ->everyFifteenSeconds()
    ->withoutOverlapping();

Schedule::command('sites:audit-due')
    // ->everySixHours()
    ->everyFifteenSeconds()
    ->withoutOverlapping();
