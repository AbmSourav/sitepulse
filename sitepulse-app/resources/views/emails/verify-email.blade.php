@component('mail::message')

# Hi {{ $name }},

Thanks for signing up for **SitePulse**. Please verify your email address to get started.

@component('mail::button', ['url' => $url, 'color' => 'green'])
Verify Email Address
@endcomponent

This link will expire in 60 minutes. If you did not create an account, no action is needed.

<x-slot:subcopy>
If you're having trouble clicking the 'Verify Email Address' button, copy and paste the URL below into your web browser: <br />
<span class="break-all">{{ $url }}</span>
</x-slot:subcopy>

@endcomponent
