<?php
namespace App\Core;

use Dotenv\Dotenv;

final class Env {
  public static function load(): void {
    $base = dirname(__DIR__, 2);
    if (file_exists($base.'/.env')) {
      Dotenv::createImmutable($base)->load();
    } elseif (file_exists($base.'/.env.example')) {
      Dotenv::createImmutable($base, ['.env.example'])->load();
    }
  }
}
