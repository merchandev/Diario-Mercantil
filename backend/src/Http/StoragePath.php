<?php
declare(strict_types=1);

final class StoragePath
{
    public static function getUploadsDir(): string
    {
        $dir = realpath(__DIR__ . '/../../storage/uploads');
        if (!$dir || !is_dir($dir)) {
            throw new RuntimeException('Uploads directory not found or not accessible');
        }
        return $dir;
    }

    public static function getFile(string $filename): string
    {
        $filename = basename($filename);
        $path = self::getUploadsDir() . DIRECTORY_SEPARATOR . $filename;
        if (!file_exists($path)) {
            throw new RuntimeException('File not found: ' . $filename);
        }
        return $path;
    }

    public static function getAvatarDir(): string
    {
        $dir = realpath(__DIR__ . '/../../storage/avatars');
        if (!$dir || !is_dir($dir)) {
            throw new RuntimeException('Avatars directory not found or not accessible');
        }
        return $dir;
    }

    public static function getAvatar(string $filename): string
    {
        $filename = basename($filename);
        $path = self::getAvatarDir() . DIRECTORY_SEPARATOR . $filename;
        if (!file_exists($path)) {
            throw new RuntimeException('Avatar not found: ' . $filename);
        }
        return $path;
    }
}
