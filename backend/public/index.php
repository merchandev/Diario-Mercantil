<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit(0);

require_once __DIR__."/../src/AuthController.php";
require_once __DIR__."/../src/UserController.php";
require_once __DIR__."/../src/LegalController.php";
require_once __DIR__."/../src/SystemController.php";
require_once __DIR__."/../src/Response.php";

require_once __DIR__."/../src/RateController.php";

$uri = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
$method = $_SERVER["REQUEST_METHOD"];

// --- 1. AUTH ---
if ($uri === "/api/auth/login" && $method === "POST") { (new AuthController())->login(); }
elseif ($uri === "/api/auth/me") { (new AuthController())->me(); }
elseif ($uri === "/api/auth/logout" && $method === "POST") { (new AuthController())->logout(); }
elseif ($uri === "/api/auth/register" && $method === "POST") { (new AuthController())->register(); }

// --- 2. USERS ---
elseif ($uri === "/api/users" && $method === "GET") { (new UserController())->list(); }
elseif ($uri === "/api/users" && $method === "POST") { (new UserController())->create(); }
elseif (preg_match("#^/api/users/(\d+)$#", $uri, $m)) {
    if ($method === "PUT") (new UserController())->update($m[1]);
    if ($method === "DELETE") (new UserController())->delete($m[1]);
}

// --- 3. LEGAL (Requests) ---
elseif ($uri === "/api/legal/upload-pdf" && $method === "POST") { (new LegalController())->uploadPdf(); }
elseif ($uri === "/api/legal/trash" && $method === "GET") { (new LegalController())->listTrashed(); }
elseif ($uri === "/api/legal/trash" && $method === "DELETE") { (new LegalController())->emptyTrash(); }
elseif ($uri === "/api/legal" && $method === "GET") { (new LegalController())->list(); }
elseif ($uri === "/api/legal" && $method === "POST") { (new LegalController())->create(); }

elseif (preg_match("#^/api/legal/(\d+)$#", $uri, $m)) {
    if ($method === "GET") (new LegalController())->get($m[1]);
    if ($method === "PUT") (new LegalController())->update($m[1]);
    if ($method === "DELETE") (new LegalController())->softDelete($m[1]);
}
// Actions
elseif (preg_match("#^/api/legal/(\d+)/restore$#", $uri, $m) && $method === "POST") { (new LegalController())->restore($m[1]); }
elseif (preg_match("#^/api/legal/(\d+)/reject$#", $uri, $m) && $method === "POST") { (new LegalController())->reject($m[1]); }
elseif (preg_match("#^/api/legal/(\d+)/download$#", $uri, $m) && $method === "GET") { (new LegalController())->download($m[1]); }
// Files
elseif (preg_match("#^/api/legal/(\d+)/files$#", $uri, $m)) {
    if ($method === "GET") (new LegalController())->listFiles($m[1]); // Ensure method exists in LegalController or Stub
}
// Payments sub-resource
elseif (preg_match("#^/api/legal/(\d+)/payments$#", $uri, $m) && $method === "POST") { (new LegalController())->addPayment($m[1]); }
elseif (preg_match("#^/api/legal/(\d+)/payments/(\d+)$#", $uri, $m) && $method === "DELETE") { (new LegalController())->deletePayment($m[1], $m[2]); }

// --- 4. SYSTEM / AUXILIARY (Fixed 404s) ---
elseif ($uri === "/api/stats" && $method === "GET") { (new SystemController())->getStats(); }
elseif ($uri === "/api/rate/bcv" && $method === "GET") { (new RateController())->bcv(); }
elseif ($uri === "/api/settings" && $method === "GET") { (new SystemController())->getSettings(); }
elseif ($uri === "/api/settings" && $method === "POST") { (new SystemController())->saveSettings(); }
elseif ($uri === "/api/editions" && $method === "GET") { (new SystemController())->listEditions(); }
elseif ($uri === "/api/payments" && $method === "GET") { (new SystemController())->listPayments(); }
elseif ($uri === "/api/public/pages" && $method === "GET") { (new SystemController())->listPagesPublic(); }
elseif ($uri === "/api/system/fix" && $method === "GET") { (new SystemController())->emergencyFix(); }

// Directory
elseif ($uri === "/api/directory/profile" && $method === "GET") { (new SystemController())->getDirectoryProfile(); }
elseif ($uri === "/api/directory/areas" && $method === "GET") { Response::json(["items"=>[]]); } // Stub
elseif ($uri === "/api/directory/colleges" && $method === "GET") { Response::json(["items"=>[]]); } // Stub

// Fallback
else {
  http_response_code(404);
  echo json_encode(["error"=>"Route not found: $method $uri"]);
}
