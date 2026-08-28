<?php

namespace App\Support;

use App\Models\User;

/**
 * Autorização do Backlog alinhada ao `/me` (getAllPermissions).
 */
final class BacklogAuthorization
{
    public static function canRead(User $user): bool
    {
        return self::hasPermissionName($user, 'backlog.ler');
    }

    public static function canWrite(User $user): bool
    {
        return self::hasPermissionName($user, 'backlog.escrever');
    }

    private static function hasPermissionName(User $user, string $name): bool
    {
        return $user->getAllPermissions()->contains('name', $name);
    }
}
