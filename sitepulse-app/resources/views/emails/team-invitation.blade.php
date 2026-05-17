@component('mail::message')

# You've been invited to join {{ $teamName }}

**{{ $inviterName }}** has invited you to join the "{{ $teamName }}" team on SitePulse.

Click the button below to accept the invitation and get started.

@component('mail::button', ['url' => $acceptUrl, 'color' => 'green'])
Accept Invitation
@endcomponent

If you weren't expecting this invitation, you can ignore this email.

<x-slot:subcopy>
If you're having trouble clicking the "Accept invitation" button, copy and paste the URL below into your web browser: <br />
<span class="break-all">{{ $acceptUrl }}</span>
</x-slot:subcopy>

@endcomponent
