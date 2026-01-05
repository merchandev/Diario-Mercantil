<?php
namespace App\Core;

use FastRoute\RouteCollector;
use function FastRoute\simpleDispatcher;
use Psr\Container\ContainerInterface;

final class Router {
  private array $routes; private ?ContainerInterface $container; private array $middlewares;
  public function __construct(array $routes, ?ContainerInterface $container = null, array $middlewares = []){
    $this->routes = $routes; $this->container = $container; $this->middlewares = $middlewares;
  }

  public function dispatch(string $method, string $uri){
    $cleanUri = strtok($uri, '?');
    $dispatcher = simpleDispatcher(function(RouteCollector $r){
      foreach ($this->routes as $rt) {
        // format: [method, path, handler, opts(optional array)]
        $m = $rt[0]; $path = $rt[1]; $handler = $rt[2];
        $r->addRoute($m,$path,$handler);
      }
    });
    $routeInfo = $dispatcher->dispatch($method, $cleanUri);
    switch ($routeInfo[0]) {
      case \FastRoute\Dispatcher::NOT_FOUND:
        Response::json(['error'=>'Not Found'],404); return;
      case \FastRoute\Dispatcher::METHOD_NOT_ALLOWED:
        Response::json(['error'=>'Method Not Allowed'],405); return;
      case \FastRoute\Dispatcher::FOUND:
        $handler = $routeInfo[1]; $vars = $routeInfo[2];
        $routeDef = $this->findRouteDef($method, $cleanUri);
        $opts = $routeDef[3] ?? [];
        $stack = [];
        if (isset($this->middlewares['error'])) { $stack[] = $this->middlewares['error']; }
        if (($opts['auth'] ?? false) === true && isset($this->middlewares['auth'])) {
          $stack[] = $this->middlewares['auth'];
        }
        $mMethod = $method; $mUri = $cleanUri; $mVars = $vars;
        $final = function() use ($handler,$vars){
          if (is_callable($handler)) { return $handler($vars); }
          if (is_string($handler) && str_contains($handler,'@')) {
            [$class,$mh] = explode('@',$handler,2);
            $fqcn = 'App\\Controllers\\'.$class;
            if (!class_exists($fqcn)) { Response::json(['error'=>'Handler missing'],500); return; }
            $obj = $this->container ? $this->container->get($fqcn) : new $fqcn();
            return $obj->$mh($vars);
          }
          Response::json(['error'=>'Bad handler'],500); return;
        };
        $runner = array_reduce(array_reverse($stack), function($next, $mw) use ($mMethod,$mUri,$mVars){
          return function() use ($mw,$next,$mMethod,$mUri,$mVars){ return $mw->handle($mMethod,$mUri,$mVars,$next); };
        }, $final);
        return $runner();
    }
  }

  private function findRouteDef(string $method, string $uri): array {
    foreach ($this->routes as $rt) {
      if ($rt[0] !== $method) { continue; }
      $pattern = $rt[1];
      if ($pattern === $uri) { return $rt; }
      if (str_contains($pattern, '{')) {
        // Transform FastRoute style segments {var} or {var:regex}
        $regex = preg_replace_callback('/\{([^}:]+)(?::([^}]+))?\}/', function($m){
          $r = $m[2] ?? '[^/]+'; return '(' . $r . ')';
        }, $pattern);
        $regex = '#^' . $regex . '$#';
        if (preg_match($regex, $uri)) { return $rt; }
      }
    }
    return [];
  }
}
