<?php
declare(strict_types=1);

final class StoragePath
{
    public static function getUploadsDir(): string
    {
        $configured = trim((string)(getenv('UPLOAD_DIR') ?: ''));
        $candidate = $configured !== ''
            ? $configured
            : __DIR__ . '/../../storage/uploads';

        $dir = realpath($candidate);
        if ($dir === false || !is_dir($dir)) {
            throw new RuntimeException('Uploads directory not found or not accessible');
        }
        return rtrim($dir, DIRECTORY_SEPARATOR);
    }

    public static function getFile(string $relativePath): string
    {
        $relativePath = str_replace('\\', '/', trim($relativePath));
        if (
            $relativePath === '' ||
            str_contains($relativePath, "\0") ||
            str_starts_with($relativePath, '/') ||
            preg_match('/^[A-Za-z]:\//', $relativePath) ||
            preg_match('#(^|/)\.\.?(/|$)#', $relativePath)
        ) {
            throw new RuntimeException('Invalid storage path');
        }

        $base = self::getUploadsDir();
        $candidate = $base . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath);
        $real = realpath($candidate);
        if ($real === false || !is_file($real)) {
            throw new RuntimeException('File not found: ' . $relativePath);
        }

        $prefix = $base . DIRECTORY_SEPARATOR;
        if (!str_starts_with($real, $prefix)) {
            throw new RuntimeException('Storage path escapes uploads directory');
        }

        return $real;
    }

    public static function getAvatarDir(): string
    {
        $candidate = trim((string)(getenv('AVATAR_DIR') ?: ''));
        if ($candidate === '') {
            $candidate = __DIR__ . '/../../storage/avatars';
        }
        $dir = realpath($candidate);
        if ($dir === false || !is_dir($dir)) {
            throw new RuntimeException('Avatars directory not found or not accessible');
        }
        return rtrim($dir, DIRECTORY_SEPARATOR);
    }

    public static function getAvatar(string $filename): string
    {
        $filename = basename($filename);
        if ($filename === '' || str_contains($filename, "\0")) {
            throw new RuntimeException('Invalid avatar filename');
        }
        $path = self::getAvatarDir() . DIRECTORY_SEPARATOR . $filename;
        $real = realpath($path);
        if ($real === false || !is_file($real)) {
            throw new RuntimeException('Avatar not found: ' . $filename);
        }
        return $real;
    }
}
