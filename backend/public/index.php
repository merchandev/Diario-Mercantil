<?php
require_once __DIR__.'/../src/UploadController.php';
require_once __DIR__.'/../src/FileController.php';
require_once __DIR__.'/../src/Database.php';
require_once __DIR__.'/../src/Response.php';
require_once __DIR__.'/../src/AuthController.php';
require_once __DIR__.'/../src/EditionController.php';
require_once __DIR__.'/../src/PaymentController.php';
require_once __DIR__.'/../src/LegalController.php';
require_once __DIR__.'/../src/UserController.php';
require_once __DIR__.'/../src/SettingsController.php';
require_once __DIR__.'/../src/RateController.php';
require_once __DIR__.'/../src/PublicationController.php';
require_once __DIR__.'/../src/PagesController.php';
require_once __DIR__.'/../src/StatsController.php';
require_once __DIR__.'/../src/DirectoryController.php';

$env = __DIR__.'/../.env';
if (file_exists($env)) {
  foreach (file($env, FILE_IGNORE_NEW_LINES|FILE_SKIP_EMPTY_LINES) as $line) {
    if (str_starts_with(trim($line),'#')) continue;
    if (!str_contains($line,'=')) continue;
    putenv($line);
  }
}


$legacyDb = __DIR__.'/../database.sqlite';
$newDb = __DIR__.'/../storage/database.sqlite';
if (file_exists($legacyDb) && !file_exists($newDb)) {
  @copy($legacyDb, $newDb);
}
$pdo = Database::pdo();
$schema = __DIR__.'/../migrations/init.sql';
$pdo->exec(file_get_contents($schema));
// Log all PHP errors to a file for debugging - NEVER display errors to avoid breaking JSON responses
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__.'/../storage/php-error.log');

// Ensure new columns exist for users table (SQLite doesn't support IF NOT EXISTS for columns)
try {
  $cols = [];
  foreach ($pdo->query("PRAGMA table_info(users)") as $row) { $cols[$row['name']] = true; }
  $need = [
    'email' => 'TEXT',
    'phone' => 'TEXT',
    'status' => "TEXT DEFAULT 'active'",
    'person_type' => "TEXT DEFAULT 'natural'",
    'avatar_url' => 'TEXT',
    'updated_at' => 'TEXT'
  ];
  foreach ($need as $name=>$type) {
    if (!isset($cols[$name])) { $pdo->exec("ALTER TABLE users ADD COLUMN $name $type"); }
  }
  // Backfill updated_at if null
  $pdo->exec("UPDATE users SET updated_at = COALESCE(updated_at, created_at)");
} catch (Throwable $e) {
  // ignore
}

// Ensure new columns exist for legal_requests and payments table present
try {
  // columns for legal_requests
  $lcols = [];
  foreach ($pdo->query("PRAGMA table_info(legal_requests)") as $row) { $lcols[$row['name']] = true; }
  $lneed = [
    'order_no' => 'TEXT',
    'publish_date' => 'TEXT',
    'phone' => 'TEXT',
    'email' => 'TEXT',
    'address' => 'TEXT',
    'folios' => 'INTEGER DEFAULT 1',
    'comment' => 'TEXT',
    'deleted_at' => 'TEXT'
  ];
  foreach ($lneed as $name=>$type) {
    if (!isset($lcols[$name])) { $pdo->exec("ALTER TABLE legal_requests ADD COLUMN $name $type"); }
  }
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_legal_requests_deleted ON legal_requests(deleted_at)");
  // create payments table if not exists (idempotent)
  $pdo->exec("CREATE TABLE IF NOT EXISTS legal_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    legal_request_id INTEGER NOT NULL,
    ref TEXT,
    date TEXT NOT NULL,
    bank TEXT,
    type TEXT,
    amount_bs REAL NOT NULL,
    status TEXT,
    comment TEXT,
    created_at TEXT NOT NULL,
    mobile_phone TEXT,
    FOREIGN KEY(legal_request_id) REFERENCES legal_requests(id) ON DELETE CASCADE
  );");
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_legal_payments_req ON legal_payments(legal_request_id)");
  // Ensure mobile_phone column exists (legacy DBs may miss it)
  try {
    $pmCols = [];
    foreach ($pdo->query("PRAGMA table_info(legal_payments)") as $row) { $pmCols[$row['name']] = true; }
    if (!isset($pmCols['mobile_phone'])) {
      $pdo->exec("ALTER TABLE legal_payments ADD COLUMN mobile_phone TEXT");
    }
  } catch (Throwable $e) { /* ignore */ }
  // ensure columns exist for legal_requests new fields
  foreach ([
    'user_id INTEGER',
    "pub_type TEXT DEFAULT 'Documento'",
    'meta TEXT'
  ] as $colDef) {
    [$cname] = explode(' ', $colDef, 2);
    if (!isset($lcols[$cname])) { $pdo->exec("ALTER TABLE legal_requests ADD COLUMN $colDef"); }
  }
  // attachments table
  $pdo->exec("CREATE TABLE IF NOT EXISTS legal_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    legal_request_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    file_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(legal_request_id) REFERENCES legal_requests(id) ON DELETE CASCADE,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
  );");
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_legal_files_req ON legal_files(legal_request_id)");
} catch (Throwable $e) {
  // ignore
}

// Ensure editions table supports manual PDF upload (idempotent)
try {
  $ecols = [];
  foreach ($pdo->query("PRAGMA table_info(editions)") as $row) { $ecols[$row['name']] = true; }
  if (!isset($ecols['file_id'])) { $pdo->exec("ALTER TABLE editions ADD COLUMN file_id INTEGER"); }
  if (!isset($ecols['file_name'])) { $pdo->exec("ALTER TABLE editions ADD COLUMN file_name TEXT"); }
} catch (Throwable $e) {
  // ignore
}

// Seed default CMS pages (idempotent)
try {
  $now = gmdate('c');
  // Ensure pages table exists
  $pdo->exec("CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    header_html TEXT,
    body_json TEXT,
    footer_html TEXT,
    status TEXT NOT NULL DEFAULT 'published',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )");
  $defaults = [
    ['inicio','Inicio'],
    ['sobre-el-diario','Sobre el Diario'],
    ['como-publicar','Cómo Publicar'],
    ['ediciones','Ediciones'],
    ['directorio-legal','Directorio Legal'],
    ['preguntas-frecuentes','Preguntas Frecuentes'],
  ];
  $tplBlocks = json_encode([
    [ 'id'=>'h1','type'=>'heading','props'=>['text'=>'Título de la página','level'=>2,'align'=>'left'] ],
    [ 'id'=>'p1','type'=>'paragraph','props'=>['text'=>'Agrega contenido desde el constructor visual.','align'=>'left'] ],
  ], JSON_UNESCAPED_UNICODE);
  $ins = $pdo->prepare('INSERT OR IGNORE INTO pages(slug,title,header_html,body_json,footer_html,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)');
  foreach ($defaults as [$slug,$title]) {
    $ins->execute([$slug, $title, '', $tplBlocks, '', 'published', $now, $now]);
  }
  // Remove reserved 'contacto' page if it exists to ensure it is plugin-managed only
  try { $pdo->prepare('DELETE FROM pages WHERE slug=?')->execute(['contacto']); } catch (Throwable $e) {}
} catch (Throwable $e) {
  // ignore
}

// Ensure feature flags / preview toggles (idempotent)
try {
  $now = gmdate('c');
  $flag = getenv('RAPTOR_MINI_PREVIEW');
  if ($flag === false || $flag === null || $flag === '') { $flag = '1'; }
  // Only insert if not present, so admin can override later via UI
  $stmt = $pdo->prepare("INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES(?,?,?)");
  $stmt->execute(['raptor_mini_preview_enabled', (string)$flag, $now]);
} catch (Throwable $e) {
  // ignore
}

// Seed default Directorio Legal lists (areas & colleges) idempotently
try {
  $now = gmdate('c');
  $pdo->exec("CREATE TABLE IF NOT EXISTS directory_areas (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
  $pdo->exec("CREATE TABLE IF NOT EXISTS directory_colleges (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
  $insA = $pdo->prepare('INSERT OR IGNORE INTO directory_areas(name,created_at,updated_at) VALUES(?,?,?)');
  foreach ([ 'Civil','Mercantil','Penal' ] as $name) { $insA->execute([$name,$now,$now]); }
  $insC = $pdo->prepare('INSERT OR IGNORE INTO directory_colleges(name,created_at,updated_at) VALUES(?,?,?)');
  foreach ([ 'Colegio de Abogados de Caracas', 'Colegio de Abogados del Estado Anzoátegui', 'Colegio de Abogados del Estado Monagas' ] as $name) { $insC->execute([$name,$now,$now]); }
} catch (Throwable $e) {
  // ignore
}

// Seed initial admin user if configured via environment variables (idempotent)
$adminDoc = getenv('ADMIN_DOCUMENT') ?: null;
$adminPass = getenv('ADMIN_PASSWORD') ?: null;
$adminName = getenv('ADMIN_NAME') ?: 'Administrador';
$adminForceReset = getenv('ADMIN_FORCE_RESET') ?: '0';
if ($adminDoc && $adminPass) {
  try {
    $exists = $pdo->prepare('SELECT COUNT(*) FROM users WHERE document=?');
    $exists->execute([$adminDoc]);
    $count = (int)$exists->fetchColumn();
    if ($count === 0) {
      $now = gmdate('c');
      $hash = password_hash($adminPass, PASSWORD_BCRYPT);
      $stmt = $pdo->prepare('INSERT INTO users(document,name,password_hash,role,created_at) VALUES(?,?,?,?,?)');
      $stmt->execute([$adminDoc,$adminName,$hash,'admin',$now]);
    } elseif ($adminForceReset === '1') {
      // Optionally rotate password and enforce admin role for existing user on deploy
      $hash = password_hash($adminPass, PASSWORD_BCRYPT);
      $stmt = $pdo->prepare('UPDATE users SET password_hash=?, name=?, role=? WHERE document=?');
      $stmt->execute([$hash,$adminName,'admin',$adminDoc]);
    }
  } catch (Throwable $e) {
    // ignore if table not ready or other seed issues
  }
}

$method = $_SERVER['REQUEST_METHOD'];
$path = strtok($_SERVER['REQUEST_URI'],'?');

// CORS headers para permitir requests desde el frontend
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS requests
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function home() {
  echo "<!doctype html><html><head><meta charset='utf-8'><title>Backend activo</title>
  <style>body{font-family:system-ui;padding:2rem}a{color:#175ded}</style></head><body>";
  echo "<h1>🚀 Backend activo</h1><p>API del dashboard de cargas.</p>";
  echo "<ul>
    <li><a href='/api/ping'>/api/ping</a></li>
    <li>POST /api/files (multipart: files[])</li>
    <li>GET /api/files</li>
    <li>GET /api/files/{id}</li>
    <li>POST /api/files/{id}/retry</li>
    <li>GET /api/events (SSE)</li>
  </ul>";
  echo "</body></html>";
}

function route($method,$path) {
  if ($method==='GET' && $path==='/') return home();
  if ($method==='GET' && $path==='/api/ping') return Response::json(['status'=>'ok','time'=>gmdate('c')]);
  if ($method==='GET' && $path==='/api/rate/bcv') { $r=new RateController(); return $r->bcv(); }
  if ($method==='GET' && $path==='/api/rate/bcv-html') { $r=new RateController(); return $r->bcvHtml(); }
  if ($method==='GET' && preg_match('#^/api/p/([a-z0-9\-]+)$#',$path,$m)) { $p=new PublicationController(); return $p->publicGet($m[1]); }
  if ($method==='GET' && preg_match('#^/api/page/([a-z0-9\-]+)$#',$path,$m)) { $pg=new PagesController(); return $pg->publicGet($m[1]); }
  if ($method==='GET' && $path==='/api/public/pages') { $pg=new PagesController(); return $pg->publicList(); }
  if ($method==='GET' && preg_match('#^/api/e/([A-Za-z0-9_\-]+)$#',$path,$m)) { $ed=new EditionController(); return $ed->publicByCode($m[1]); }
  if ($method==='GET' && preg_match('#^/api/e/([A-Za-z0-9_\-]+)/download$#',$path,$m)) { $ed=new EditionController(); return $ed->downloadByCode($m[1]); }
  // Public upload serving (only if file belongs to a published legal request)
  if ($method==='GET' && preg_match('#^/api/public/uploads/(\d+)$#',$path,$m)) {
    $fileId = (int)$m[1];
    $pdo = Database::pdo();
    $stmt = $pdo->prepare("SELECT f.id, f.name, f.type FROM legal_files lf JOIN files f ON f.id=lf.file_id JOIN legal_requests lr ON lr.id=lf.legal_request_id WHERE f.id=? AND lr.status='Publicada' AND lr.deleted_at IS NULL LIMIT 1");
    $stmt->execute([$fileId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) { http_response_code(404); return Response::json(['error'=>'Archivo no disponible']); }

    // Locate physical file in storage/uploads
    $uploadDir = realpath(__DIR__.'/../storage/uploads');
    $files = glob($uploadDir.'/*');
    $targetFile = null;
    foreach ($files as $fp) {
      if (strpos(basename($fp), $row['name']) !== false) { $targetFile = $fp; break; }
    }
    if (!$targetFile || !file_exists($targetFile)) { http_response_code(404); return Response::json(['error'=>'Archivo físico no encontrado']); }

    // Serve inline (no forced download) with basic hardening
    $mimeType = $row['type'] === 'pdf' ? 'application/pdf' : (mime_content_type($targetFile) ?: 'application/octet-stream');
    header('Content-Type: '.$mimeType);
    header('Content-Disposition: inline; filename="'.basename($row['name']).'"');
    header('Content-Length: '.filesize($targetFile));
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store, max-age=0');
    header('Accept-Ranges: bytes');
    readfile($targetFile);
    exit;
  }
  // Public endpoint for publications (by order number)
  if ($method==='GET' && preg_match('#^/api/public/publicaciones/([A-Za-z0-9_\-]+)$#',$path,$m)) { $lg=new LegalController(); return $lg->getPublic($m[1]); }
  // Public read-only access to settings (needed for public header)
  if ($method==='GET' && $path==='/api/settings') { $set=new SettingsController(); return $set->get(); }

  $auth = new AuthController();
  // Auth endpoints (unprotected)
  if ($method==='POST' && $path==='/api/auth/login') return $auth->login();
  if ($method==='POST' && $path==='/api/auth/register') return $auth->register();
  if ($method==='GET' && $path==='/api/auth/me') return $auth->me();
  if ($method==='POST' && $path==='/api/auth/logout') return $auth->logout();

  // Protected endpoints
  AuthController::requireAuth();
  $u = new UploadController();
  $f = new FileController();
  $ed = new EditionController();
  $pm = new PaymentController();
  $lg = new LegalController();
  $usr = new UserController();
  $set = new SettingsController();
  $pb = new PublicationController();
  $pgs = new PagesController();
  $st = new StatsController();
  $dir = new DirectoryController();
  
  // Serve avatar files (public access)
  if ($method==='GET' && preg_match('#^/storage/avatars/(.+)$#',$path,$m)) {
    $filename = basename($m[1]);
    $filepath = __DIR__.'/../storage/avatars/'.$filename;
    if (!file_exists($filepath)) {
      http_response_code(404);
      return Response::json(['error'=>'Avatar no encontrado']);
    }
    $mimeType = mime_content_type($filepath);
    header('Content-Type: ' . $mimeType);
    header('Content-Length: ' . filesize($filepath));
    readfile($filepath);
    exit;
  }
  
  // Serve uploaded files
  if ($method==='GET' && preg_match('#^/api/uploads/(\d+)$#',$path,$m)) {
    $fileId = (int)$m[1];
    $pdo = Database::pdo();
    $stmt = $pdo->prepare('SELECT name, type FROM files WHERE id = ?');
    $stmt->execute([$fileId]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$file) {
      http_response_code(404);
      return Response::json(['error'=>'Archivo no encontrado']);
    }
    
    // Find the actual file in storage/uploads
    $uploadDir = realpath(__DIR__.'/../storage/uploads');
    $files = glob($uploadDir . '/*');
    $targetFile = null;
    
    foreach ($files as $filepath) {
      if (strpos(basename($filepath), (string)$fileId) !== false || 
          strpos(basename($filepath), $file['name']) !== false) {
        $targetFile = $filepath;
        break;
      }
    }
    
    if (!$targetFile || !file_exists($targetFile)) {
      http_response_code(404);
      return Response::json(['error'=>'Archivo físico no encontrado']);
    }
    
    // Serve the file
    $mimeType = $file['type'] === 'pdf' ? 'application/pdf' : 'application/octet-stream';
    header('Content-Type: ' . $mimeType);
    header('Content-Length: ' . filesize($targetFile));
    header('Content-Disposition: inline; filename="' . basename($file['name']) . '"');
    readfile($targetFile);
    exit;
  }
  
  if ($method==='POST' && $path==='/api/uploads/sessions') return $u->create();
  if ($method==='POST' && $path==='/api/files') return $u->upload();
  if ($method==='GET' && $path==='/api/files') return $f->list();
  if ($method==='GET' && preg_match('#^/api/files/(\d+)$#',$path,$m)) return $f->get((int)$m[1]);
  if ($method==='DELETE' && preg_match('#^/api/files/(\d+)$#',$path,$m)) return $f->delete((int)$m[1]);
  if ($method==='POST' && preg_match('#^/api/files/(\d+)/retry$#',$path,$m)) return $f->retry((int)$m[1]);
  if ($method==='GET' && $path==='/api/events') return $f->sse();

  // Editions
  if ($method==='GET' && $path==='/api/editions') return $ed->list();
  if ($method==='POST' && $path==='/api/editions') return $ed->create();
  if ($method==='GET' && preg_match('#^/api/editions/(\d+)$#',$path,$m)) return $ed->get((int)$m[1]);
  if (in_array($method,['PUT','PATCH']) && preg_match('#^/api/editions/(\d+)$#',$path,$m)) return $ed->update((int)$m[1]);
  if ($method==='POST' && preg_match('#^/api/editions/(\d+)/pdf$#',$path,$m)) return $ed->uploadPdf((int)$m[1]);
  if ($method==='POST' && preg_match('#^/api/editions/(\d+)/orders$#',$path,$m)) return $ed->setOrders((int)$m[1]);
  if ($method==='POST' && preg_match('#^/api/editions/(\d+)/auto-select$#',$path,$m)) return $ed->autoSelectOrders((int)$m[1]);
  if ($method==='POST' && preg_match('#^/api/editions/(\d+)/publish$#',$path,$m)) return $ed->publish((int)$m[1]);
  if ($method==='GET' && preg_match('#^/api/editions/([A-Za-z0-9_\-]+)/download$#',$path,$m)) {
    $val = $m[1];
    if (ctype_digit($val)) return $ed->downloadById((int)$val);
    return $ed->downloadByCode($val);
  }
  if ($method==='DELETE' && preg_match('#^/api/editions/(\d+)$#',$path,$m)) return $ed->delete((int)$m[1]);

  // Payments
  if ($method==='GET' && $path==='/api/payments') return $pm->list();
  if ($method==='POST' && $path==='/api/payments') return $pm->create();
  if ($method==='DELETE' && preg_match('#^/api/payments/(\d+)$#',$path,$m)) return $pm->delete((int)$m[1]);

  // Legal directory requests
  if ($method==='GET' && $path==='/api/legal') { error_log('📥 [index.php] GET /api/legal request received'); return $lg->list(); }
  if ($method==='POST' && $path==='/api/legal') return $lg->create();
  if ($method==='GET' && preg_match('#^/api/legal/(\d+)$#',$path,$m)) return $lg->get((int)$m[1]);
  if (in_array($method,['PUT','PATCH']) && preg_match('#^/api/legal/(\d+)$#',$path,$m)) return $lg->update((int)$m[1]);
  if ($method==='DELETE' && preg_match('#^/api/legal/(\d+)$#',$path,$m)) return $lg->softDelete((int)$m[1]);
  if ($method==='POST' && preg_match('#^/api/legal/(\d+)/reject$#',$path,$m)) return $lg->reject((int)$m[1]);
  if ($method==='POST' && preg_match('#^/api/legal/(\d+)/restore$#',$path,$m)) return $lg->restore((int)$m[1]);
  if ($method==='GET' && preg_match('#^/api/legal/(\d+)/download$#',$path,$m)) return $lg->download((int)$m[1]);
  if ($method==='POST' && preg_match('#^/api/legal/(\d+)/payments$#',$path,$m)) return $lg->addPayment((int)$m[1]);
  if ($method==='DELETE' && preg_match('#^/api/legal/(\d+)/payments/(\d+)$#',$path,$m)) return $lg->deletePayment((int)$m[1], (int)$m[2]);
  if ($method==='GET' && preg_match('#^/api/legal/(\d+)/files$#',$path,$m)) return $lg->listFiles((int)$m[1]);
  if ($method==='POST' && preg_match('#^/api/legal/(\d+)/files$#',$path,$m)) return $lg->attachFile((int)$m[1]);
  if ($method==='DELETE' && preg_match('#^/api/legal/(\d+)/files/(\d+)$#',$path,$m)) return $lg->detachFile((int)$m[1], (int)$m[2]);
  if ($method==='POST' && $path==='/api/legal/upload-pdf') return $lg->uploadPdf();
  
  // Trash management (admin only)
  if ($method==='GET' && $path==='/api/legal/trash') return $lg->listTrashed();
  if ($method==='DELETE' && $path==='/api/legal/trash') return $lg->emptyTrash();
  if ($method==='DELETE' && preg_match('#^/api/legal/trash/(\d+)$#',$path,$m)) return $lg->permanentDelete((int)$m[1]);
  if ($method==='POST' && $path==='/api/legal/cleanup') return $lg->cleanupOldTrashed();


  // Users
  if ($method==='GET' && $path==='/api/users') return $usr->list();
  if ($method==='POST' && $path==='/api/users') return $usr->create();
  if (in_array($method,['PUT','PATCH']) && preg_match('#^/api/users/(\d+)$#',$path,$m)) return $usr->update((int)$m[1]);
  if ($method==='POST' && preg_match('#^/api/users/(\d+)/password$#',$path,$m)) return $usr->setPassword((int)$m[1]);
  if ($method==='DELETE' && preg_match('#^/api/users/(\d+)$#',$path,$m)) return $usr->delete((int)$m[1]);
  if (in_array($method,['PUT','PATCH','POST']) && $path==='/api/user/profile') return $usr->updateProfile();
  if ($method==='POST' && $path==='/api/user/avatar') return $usr->uploadAvatar();

  // Settings (write-only, read is public above)
  if ($method==='POST' && $path==='/api/settings') return $set->save();

  // Publications (CRUD)
  if ($method==='GET' && $path==='/api/publications') return $pb->list();
  if ($method==='POST' && $path==='/api/publications') return $pb->create();
  if ($method==='GET' && preg_match('#^/api/publications/(\d+)$#',$path,$m)) return $pb->get((int)$m[1]);
  if (in_array($method,['PUT','PATCH']) && preg_match('#^/api/publications/(\d+)$#',$path,$m)) return $pb->update((int)$m[1]);
  if ($method==='DELETE' && preg_match('#^/api/publications/(\d+)$#',$path,$m)) return $pb->delete((int)$m[1]);

  // Pages (CRUD)
  if ($method==='GET' && $path==='/api/pages') return $pgs->list();
  if ($method==='POST' && $path==='/api/pages') return $pgs->create();
  if ($method==='GET' && preg_match('#^/api/pages/(\d+)$#',$path,$m)) return $pgs->get((int)$m[1]);
  if (in_array($method,['PUT','PATCH']) && preg_match('#^/api/pages/(\d+)$#',$path,$m)) return $pgs->update((int)$m[1]);
  if ($method==='DELETE' && preg_match('#^/api/pages/(\d+)$#',$path,$m)) return $pgs->delete((int)$m[1]);

  // Stats
  if ($method==='GET' && $path==='/api/stats') return $st->get();
  if ($method==='POST' && $path==='/api/stats/clear') return $st->clear();

  // Directory profiles (applicant)
  if ($method==='GET' && $path==='/api/directory/profile') return $dir->getProfile();
  if ($method==='POST' && $path==='/api/directory/profile') return $dir->saveProfile();
  if ($method==='POST' && $path==='/api/directory/profile/photo') return $dir->setPhoto();

  // Directory reference admin (areas & colleges)
  if ($method==='GET' && $path==='/api/directory/areas') return $dir->listAreas();
  if ($method==='POST' && $path==='/api/directory/areas') return $dir->createArea();
  if (in_array($method,['PUT','PATCH']) && preg_match('#^/api/directory/areas/(\d+)$#',$path,$m)) return $dir->updateArea((int)$m[1]);
  if ($method==='DELETE' && preg_match('#^/api/directory/areas/(\d+)$#',$path,$m)) return $dir->deleteArea((int)$m[1]);

  if ($method==='GET' && $path==='/api/directory/colleges') return $dir->listColleges();
  if ($method==='POST' && $path==='/api/directory/colleges') return $dir->createCollege();
  if (in_array($method,['PUT','PATCH']) && preg_match('#^/api/directory/colleges/(\d+)$#',$path,$m)) return $dir->updateCollege((int)$m[1]);
  if ($method==='DELETE' && preg_match('#^/api/directory/colleges/(\d+)$#',$path,$m)) return $dir->deleteCollege((int)$m[1]);

  http_response_code(404); 
  Response::json(['error'=>'Not Found'], 404);
}

// Global error handler to catch any uncaught exceptions and return JSON
set_exception_handler(function($e) {
  error_log("Uncaught exception: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
  http_response_code(500);
  header('Content-Type: application/json');
  echo json_encode(['error'=>'Error interno del servidor']);
  exit;
});

try {
  route($method,$path);
} catch (Throwable $e) {
  error_log("Route error: " . $e->getMessage());
  Response::json(['error'=>'Error en el servidor: ' . $e->getMessage()], 500);
}
