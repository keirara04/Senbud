<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class WaitlistConfirmation extends Mailable
{
    public function __construct(public string $url) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Confirm your spot on the Senbud waitlist');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.waitlist-confirmation');
    }
}
