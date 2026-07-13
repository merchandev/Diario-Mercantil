<?php
declare(strict_types=1);

final class Router
{
    private array $routes = [];

    public function get(string $path, array $handler, array $middlewares = []): void
    {
        $this->addRoute('GET', $path, $handler, $middlewares);
    }

    public function post(string $path, array $handler, array $middlewares = []): void
    {
        $this->addRoute('POST', $path, $handler, $middlewares);
    }

    public function put(string $path, array $handler, array $middlewares = []): void
    {
        $this->addRoute('PUT', $path, $handler, $middlewares);
    }

    public function delete(string $path, array $handler, array $middlewares = []): void
    {
        $this->addRoute('DELETE', $path, $handler, $middlewares);
    }

    private function addRoute(string $method, string $path, array $handler, array $middlewares): void
    {
        $this->routes[] = [
            'method' => $method,
            'path' => $this->convertPathToRegex($path),
            'handler' => $handler,
            'middlewares' => $middlewares,
        ];
    }

    private function convertPathToRegex(string $path): string
    {
        // Converts {id} to (?P<id>[^/]+)
        $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<\1>[^/]+)', $path);
        return '#^' . $pattern . '$#';
    }

    public function dispatch(string $method, string $uri): void
    {
        foreach ($this->routes as $route) {
            if ($route['method'] === $method && preg_match($route['path'], $uri, $matches)) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                
                // Execute middlewares
                foreach ($route['middlewares'] as $middleware) {
                    call_user_func($middleware);
                }

                // Execute handler
                $class = $route['handler'][0];
                $method = $route['handler'][1];
                $instance = new $class();
                
                // If there are params, pass them by sorting keys, or just pass as array/splat
                call_user_func_array([$instance, $method], array_values($params));
                return;
            }
        }

        throw new HttpException(404, 'route_not_found', "Route not found: $method $uri");
    }
}
