<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RedefinirSenha extends Notification
{
    use Queueable;

    public function __construct(public string $token) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = url(route('senha.redefinir', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], false));

        return (new MailMessage)
            ->subject('Redefinir senha da área do cliente')
            ->greeting('Olá,')
            ->line('Recebemos um pedido para redefinir a senha desta conta.')
            ->action('Escolher nova senha', $url)
            ->line('O link vale por 30 minutos. Se você não pediu, ignore este e-mail.')
            ->salutation('Trigger Data Intelligence');
    }
}
