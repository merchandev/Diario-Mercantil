<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit(0);

require_once __DIR__."/../src/AuthController.php";
require_once __DIR__."/../src/UserController.php";
require_once __DIR__."/../src/LegalController.php";

$uri = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
$method = $_SERVER["REQUEST_METHOD"];

// Rutas Auth
if ($uri === "/api/auth/login" && $method === "POST") { (new AuthController())->login(); }
elseif ($uri === "/api/auth/me") { (new AuthController())->me(); }
elseif ($uri === "/api/auth/register" && $method === "POST") { (new AuthController())->register(); }

// Rutas Users
elseif ($uri === "/api/users" && $method === "GET") { (new UserController())->list(); }
elseif (preg_match('#^/api/users$#', $uri) && $method === 'POST') { (new UserController())->create(); }
elseif (preg_match('#^/api/users/(\d+)$#', $uri, $m) && $method === 'PUT') { (new UserController())->update($m[1]); }
elseif (preg_match('#^/api/users/(\d+)$#', $uri, $m) && $method === 'DELETE') { (new UserController())->delete($m[1]); }

// Rutas Legal (Upload)
elseif ($uri === "/api/legal/upload-pdf" && $method === "POST") { (new LegalController())->uploadPdf(); }

else {
  http_response_code(404);
  echo json_encode(["error"=>"Route not found: $method $uri"]);
}
