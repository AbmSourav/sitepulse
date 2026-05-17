<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

class VerifyEmailNotification extends VerifyEmail
{
    public function toMail($notifiable): MailMessage
    {
        $url = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('Verify your SitePulse email address')
            ->from('no-reply@sitepulsee.com', "SitePulse")
            ->markdown('emails.verify-email', [
                'url'  => $url,
                'name' => $notifiable->name ?? 'there',
            ]);
    }
}
