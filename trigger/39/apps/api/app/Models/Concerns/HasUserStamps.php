<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * Selos de autoria no agregado (não substitui audit_logs de→para).
 * Nunca aceitar criado_por/atualizado_por via mass assignment.
 */
trait HasUserStamps
{
    public static function bootHasUserStamps(): void
    {
        static::creating(function ($model): void {
            $userId = Auth::id();
            if (! $userId) {
                return;
            }

            if (! $model->getAttribute('criado_por')) {
                $model->setAttribute('criado_por', $userId);
            }

            if (! $model->getAttribute('atualizado_por')) {
                $model->setAttribute('atualizado_por', $userId);
            }
        });

        static::updating(function ($model): void {
            $userId = Auth::id();
            if (! $userId) {
                return;
            }

            $model->setAttribute('atualizado_por', $userId);
        });
    }

    public function initializeHasUserStamps(): void
    {
        $this->hidden = array_values(array_unique(array_merge($this->hidden ?? [], [
            'criador',
            'atualizador',
        ])));
    }

    public function criador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por');
    }

    public function atualizador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'atualizado_por');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $array = parent::toArray();

        return $this->mergeUserStampsIntoArray($array);
    }

    /**
     * @param  array<string, mixed>  $array
     * @return array<string, mixed>
     */
    protected function mergeUserStampsIntoArray(array $array): array
    {
        $array['criado_por'] = $this->userStampRef('criador');
        $array['atualizado_por'] = $this->userStampRef('atualizador');
        unset($array['criador'], $array['atualizador']);

        return $array;
    }

    /**
     * @return array{id: int, name: string}|null
     */
    protected function userStampRef(string $relation): ?array
    {
        if (! $this->relationLoaded($relation)) {
            $this->loadMissing([$relation.':id,name']);
        }

        /** @var User|null $user */
        $user = $this->getRelation($relation);
        if (! $user) {
            return null;
        }

        return [
            'id' => (int) $user->id,
            'name' => (string) $user->name,
        ];
    }

    /**
     * Helper para serializers manuais (toOut) sem depender de Model::toArray().
     *
     * @return array{id: int, name: string}|null
     */
    public static function userStampFrom(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        return [
            'id' => (int) $user->id,
            'name' => (string) $user->name,
        ];
    }

    /**
     * @return list<string>
     */
    public static function userStampWith(): array
    {
        return ['criador:id,name', 'atualizador:id,name'];
    }
}
