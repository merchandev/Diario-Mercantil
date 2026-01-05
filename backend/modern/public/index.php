<?php
declare(strict_types=1);

use App\Core\Router;
use App\Core\Response;
use App\Core\AuthMiddleware;
use App\Core\ErrorMiddleware;

$routes = require __DIR__.'/../config/routes.php';
require __DIR__.'/../vendor/autoload.php';

// Basic bootstrap (dotenv + others) - composer install required
if (file_exists(__DIR__.'/../bootstrap.php')) { $container = require __DIR__.'/../bootstrap.php'; }

$middlewares = [];
if (isset($container)) {
	$middlewares['error'] = $container->get(ErrorMiddleware::class);
	$middlewares['auth'] = $container->get(AuthMiddleware::class);
}
$router = new Router($routes, $container ?? null, $middlewares);
$router->dispatch($_SERVER['REQUEST_METHOD'] ?? 'GET', $_SERVER['REQUEST_URI'] ?? '/');
