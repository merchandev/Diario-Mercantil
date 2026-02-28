<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit(0);

// Disable display_errors to prevent HTML leakage into JSON responses
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL); // Log errors but don't show them

require_once __DIR__."/../src/AuthController.php";
require_once __DIR__."/../src/UserController.php";
require_once __DIR__."/../src/LegalController.php";
require_once __DIR__."/../src/SystemController.php";
require_once __DIR__."/../src/Response.php";
require_once __DIR__."/../src/RateController.php";
require_once __DIR__."/../src/SuperAdminController.php";
require_once __DIR__."/../src/PagesController.php";
require_once __DIR__."/../src/FileController.php";
require_once __DIR__."/../src/EditionController.php";

$uri = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
$method = $_SERVER["REQUEST_METHOD"];

// --- SUPERADMIN (Secret routes for /lotus/) ---
if ($uri === "/api/superadmin/login" && $method === "POST") { (new SuperAdminController())->login(); }
elseif ($uri === "/api/superadmin/verify" && $method === "GET") { (new SuperAdminController())->verify(); }
elseif ($uri === "/api/superadmin/logout" && $method === "POST") { (new SuperAdminController())->logout(); }

// --- 1. AUTH ---
elseif ($uri === "/api/auth/login" && $method === "POST") { (new AuthController())->login(); }
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
elseif (preg_match("#^/api/legal/(\d+)/download$#", $uri, $m) && $method === "GET") { (new LegalController())->download($m[1]); }
// Files
elseif (preg_match("#^/api/uploads/(\d+)$#", $uri, $m)) { (new FileController())->serve($m[1]); }
elseif ($uri === "/api/files/trash" && $method === "GET") { (new FileController())->listTrashed(); }
elseif ($uri === "/api/files/trash" && $method === "DELETE") { (new FileController())->emptyTrash(); }
elseif (preg_match("#^/api/files/trash/(\d+)$#", $uri, $m) && $method === "DELETE") { (new FileController())->permanentDelete($m[1]); }
elseif (preg_match("#^/api/files/(\d+)/restore$#", $uri, $m) && $method === "POST") { (new FileController())->restore($m[1]); }
elseif (preg_match("#^/api/files/(\d+)$#", $uri, $m)) {
    if ($method === "GET") (new FileController())->get($m[1]);
    if ($method === "DELETE") (new FileController())->softDelete($m[1]);
}
elseif ($uri === "/api/files" && $method === "GET") { (new FileController())->list(); }
elseif ($uri === "/api/files" && $method === "POST") { (new UploadController())->upload(); }
elseif (preg_match("#^/api/legal/(\d+)/files$#", $uri, $m)) {
    if ($method === "GET") (new LegalController())->listFiles($m[1]); // Ensure method exists in LegalController or Stub
}
// Payments sub-resource
elseif (preg_match("#^/api/legal/(\d+)/payments$#", $uri, $m) && $method === "POST") { (new LegalController())->addPayment($m[1]); }
elseif (preg_match("#^/api/legal/(\d+)/payments/(\d+)$#", $uri, $m) && $method === "DELETE") { (new LegalController())->deletePayment($m[1], $m[2]); }
elseif ($uri === "/api/legal/public/check" || preg_match("#^/api/legal/public/(.+)$#", $uri, $m) && $method === "GET") { (new LegalController())->getPublic($m[1]); }

// --- 4. SYSTEM / AUXILIARY (Fixed 404s) ---
elseif ($uri === "/api/stats" && $method === "GET") { (new SystemController())->getStats(); }
elseif ($uri === "/api/rate/bcv" && $method === "GET") { (new RateController())->bcv(); }
elseif ($uri === "/api/settings" && $method === "GET") { (new SystemController())->getSettings(); }
elseif ($uri === "/api/settings" && $method === "POST") { (new SystemController())->saveSettings(); }
elseif ($uri === "/api/payments" && $method === "GET") { (new SystemController())->listPayments(); }
elseif ($uri === "/api/public/pages" && $method === "GET") { (new SystemController())->listPagesPublic(); }
elseif ($uri === "/api/system/fix" && $method === "GET") { (new SystemController())->emergencyFix(); }

// --- EDITIONS ---
elseif ($uri === "/api/editions" && $method === "GET") { (new EditionController())->list(); }
elseif ($uri === "/api/editions" && $method === "POST") { (new EditionController())->create(); }
elseif (preg_match("#^/api/editions/(\d+)$#", $uri, $m)) {
    if ($method === "GET") (new EditionController())->get($m[1]);
    if ($method === "PUT") (new EditionController())->update($m[1]);
    if ($method === "DELETE") (new EditionController())->delete($m[1]);
}
elseif (preg_match("#^/api/editions/(\d+)/orders$#", $uri, $m) && $method === "POST") { (new EditionController())->setOrders($m[1]); }
elseif (preg_match("#^/api/editions/(\d+)/publish$#", $uri, $m) && $method === "POST") { (new EditionController())->publish($m[1]); }
elseif (preg_match("#^/api/editions/(\d+)/pdf$#", $uri, $m) && $method === "POST") { (new EditionController())->uploadPdf($m[1]); }
elseif (preg_match("#^/api/e/(\d+)/download$#", $uri, $m) && $method === "GET") { (new EditionController())->downloadById($m[1]); }
elseif (preg_match("#^/api/e/([^/]+)/download$#", $uri, $m) && $method === "GET") { (new EditionController())->downloadByCode($m[1]); }
elseif (preg_match("#^/api/e/([^/]+)$#", $uri, $m) && $method === "GET") { (new EditionController())->publicByCode($m[1]); }


// --- 5. PUBLICATIONS & PAGES (Public) ---
elseif (preg_match("#^/api/page/(.+)$#", $uri, $m) && $method === "GET") { (new PagesController())->publicGet($m[1]); }
elseif ($uri === "/api/publications" && $method === "GET") { (new SystemController())->listPages(); }
elseif ($uri === "/api/publications" && $method === "POST") { (new SystemController())->createPage(); }
elseif (preg_match("#^/api/publications/(\d+)$#", $uri, $m)) {
    if ($method === "PUT") (new SystemController())->updatePage($m[1]);
    if ($method === "DELETE") (new SystemController())->deletePage($m[1]);
}

// Directory
elseif ($uri === "/api/directory/profile" && $method === "GET") { (new SystemController())->getDirectoryProfile(); }
elseif ($uri === "/api/directory/areas" && $method === "GET") { Response::json(["items"=>[]]); } // Stub
elseif ($uri === "/api/directory/colleges" && $method === "GET") { Response::json(["items"=>[]]); } // Stub

// Fallback
else {
  http_response_code(404);
  echo json_encode(["error"=>"Route not found: $method $uri"]);
}
