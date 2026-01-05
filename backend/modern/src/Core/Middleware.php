<?php
namespace App\Core;

interface Middleware {
  public function handle(string $method, string $uri, array $vars, callable $next);
}
