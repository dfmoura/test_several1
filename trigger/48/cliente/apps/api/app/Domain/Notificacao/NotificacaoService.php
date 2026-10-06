<?php

declare(strict_types=1);

namespace App\Domain\Notificacao;

use App\Mail\Aviso;
use App\Models\Notificacao;
use App\Models\Usuario;
use App\Models\UsuarioTrigger;
use Illuminate\Support\Facades\Mail;

class NotificacaoService
{
    public function cliente(Usuario $usuario, ?int $empresaId, string $tipo, string $titulo, string $corpo): void
    {
        $aviso = Notificacao::query()->create([
            'destinatario_tipo' => 'CLIENTE',
            'destinatario_id' => $usuario->id,
            'empresa_id' => $empresaId,
            'tipo' => $tipo,
            'titulo' => $titulo,
            'corpo' => $corpo,
            'criada_em' => now(),
        ]);
        $this->email($aviso, $usuario->email, $titulo, $corpo);
    }

    public function trigger(UsuarioTrigger $usuario, ?int $empresaId, string $tipo, string $titulo, string $corpo): void
    {
        $aviso = Notificacao::query()->create([
            'destinatario_tipo' => 'TRIGGER',
            'destinatario_id' => $usuario->id,
            'empresa_id' => $empresaId,
            'tipo' => $tipo,
            'titulo' => $titulo,
            'corpo' => $corpo,
            'criada_em' => now(),
        ]);
        $this->email($aviso, $usuario->email, $titulo, $corpo);
    }

    public function operadores(?int $empresaId, string $tipo, string $titulo, string $corpo): void
    {
        UsuarioTrigger::query()->where('ativo', true)->each(
            fn (UsuarioTrigger $usuario) => $this->trigger($usuario, $empresaId, $tipo, $titulo, $corpo)
        );
    }

    private function email(Notificacao $aviso, string $email, string $titulo, string $corpo): void
    {
        try {
            Mail::to($email)->send(new Aviso($titulo, $corpo));
            $aviso->email_enviado_em = now();
            $aviso->save();
        } catch (\Throwable) {
            // O aviso dentro do sistema permanece mesmo se o e-mail falhar.
        }
    }
}
