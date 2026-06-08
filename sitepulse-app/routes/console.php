<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('sites:check-due')
    ->everyMinute()
    ->withoutOverlapping();

Schedule::command('sites:audit-due')
    ->everySixHours()
    // ->everyMinute()
    ->withoutOverlapping();

Schedule::command('domains:check-due')
    ->daily()
    // ->everyMinute()
    ->withoutOverlapping();
