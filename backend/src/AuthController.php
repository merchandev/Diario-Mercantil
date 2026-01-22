<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';

class AuthController {
  private function jsonInput(){
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
  }

  public static function bearerToken(): ?string {
    $headers = null;
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
      $headers = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
      $headers = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
      $req = apache_request_headers();
      if (isset($req['Authorization'])) $headers = $req['Authorization'];
      elseif (isset($req['authorization'])) $headers = $req['authorization'];
    }
    
    if ($headers && preg_match('/^Bearer\s+(.*)$/i', $headers, $m)) {
        return trim($m[1]);
    }
    
    if (isset($_GET['token'])) return trim($_GET['token']);
    return null;
  }

  public static function userFromToken(?string $token){
    if (!$token) return null;
    $pdo = Database::pdo();
    $stmt = $pdo->prepare('SELECT u.id,u.document,u.name,u.role,t.expires_at FROM auth_tokens t JOIN users u ON u.id=t.user_id WHERE t.token=?');
    $stmt->execute([$token]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) return null;
    if (strtotime($row['expires_at']) < time()) return null;
    return $row;
  }

  public static function requireAuth(){
    $token = self::bearerToken();
    $user = self::userFromToken($token);
    if (!$user) {
      http_response_code(401);
      header('Content-Type: application/json');
      echo json_encode(['error'=>'unauthorized']);
      exit;
    }
    return $user;
  }

  public function login(){
    error_log('[AUTH] 🔐 Login attempt started');
    $pdo = Database::pdo();
    $in = $this->jsonInput();
    $document = trim($in['document'] ?? '');
    $password = (string)($in['password'] ?? '');
    
    error_log('[AUTH] 📋 Login attempt for document: ' . $document);
    
    if ($document === '' || $password === '') {
      error_log('[AUTH] ❌ Missing document or password');
      Response::json(['error'=>'document_and_password_required'], 400);
    }

    // Production: do not auto-create users here. Use ADMIN_* env seeding on bootstrap.

    $userStmt = $pdo->prepare('SELECT * FROM users WHERE document=?');
    $userStmt->execute([$document]);
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
      // Fallback: Try searching without the prefix (e.g. "V123" -> "123")
      // This handles cases where users registered with just numbers but Login UI enforces prefix
      if (preg_match('/^[VEJGP][0-9]+$/i', $document)) {
        $raw = substr($document, 1);
        $userStmt->execute([$raw]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        if ($user) {
          error_log('[AUTH] ⚠️ Found user via fallback (stripped prefix): ' . $raw);
        }
      }
    }

    if (!$user) {
      error_log('[AUTH] ❌ User not found: ' . $document);
      Response::json(['error'=>'invalid_credentials'], 401);
    }
    
    if (!password_verify($password, $user['password_hash'])) {
      error_log('[AUTH] ❌ Invalid password for user: ' . $document);
      Response::json(['error'=>'invalid_credentials'], 401);
    }

    $token = bin2hex(random_bytes(32));
    $now = gmdate('c');
    $exp = gmdate('c', time() + 7*24*3600); // 7 days
    $pdo->prepare('INSERT INTO auth_tokens(user_id,token,expires_at,created_at) VALUES(?,?,?,?)')
        ->execute([$user['id'],$token,$exp,$now]);

    error_log('[AUTH] ✅ Login successful for user: ' . $document . ' (ID: ' . $user['id'] . ', Role: ' . $user['role'] . ')');

    Response::json([
      'token'=>$token,
      'user'=>[
        'id'=>(int)$user['id'],
        'document'=>$user['document'],
        'name'=>$user['name'],
        'role'=>$user['role']
      ]
    ]);
  }

  public function me(){
    $u = self::requireAuth();
    $pdo = Database::pdo();
    // Get user data including phone/email/avatar from users table
    $stmt = $pdo->prepare('SELECT id,document,name,role,phone,email,person_type,avatar_url FROM users WHERE id = ?');
    $stmt->execute([$u['id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
      Response::json(['error'=>'User not found'], 404);
      return;
    }
    // If phone/email not in users table, try to get from last legal request
    if (!$user['phone'] || !$user['email']) {
      $lrStmt = $pdo->prepare('SELECT phone,email FROM legal_requests WHERE user_id = ? ORDER BY id DESC LIMIT 1');
      $lrStmt->execute([$u['id']]);
      if ($row = $lrStmt->fetch(PDO::FETCH_ASSOC)) {
        $user['phone'] = $user['phone'] ?: ($row['phone'] ?: null);
        $user['email'] = $user['email'] ?: ($row['email'] ?: null);
      }
    }
    Response::json(['user'=>[
      'id'=>(int)$user['id'],
      'document'=>$user['document'],
      'name'=>$user['name'],
      'role'=>$user['role'],
      'phone'=>$user['phone'],
      'email'=>$user['email'],
      'person_type'=>$user['person_type'],
      'avatar_url'=>$user['avatar_url']
    ]]);
  }

  public function logout(){
    $pdo = Database::pdo();
    $token = self::bearerToken();
    if ($token) {
      $pdo->prepare('DELETE FROM auth_tokens WHERE token=?')->execute([$token]);
    }
    Response::json(['ok'=>true]);
  }

  public function register(){
    error_log('[AUTH] ✅ Register attempt started');
    $pdo = Database::pdo();
    $in = $this->jsonInput();
    
    // Validar campos requeridos
    $document = trim($in['document'] ?? '');
    $name = trim($in['name'] ?? '');
    $password = (string)($in['password'] ?? '');
    $personType = trim($in['person_type'] ?? 'natural');
    
    error_log('[AUTH] 📋 Input data - Document: ' . $document . ', Name: ' . $name . ', PersonType: ' . $personType);
    
    if ($document === '' || $name === '' || $password === '') {
      error_log('[AUTH] ❌ Missing required fields');
      Response::json(['error'=>'Documento, nombre y contraseña son requeridos'], 400);
    }

    if (strlen($password) < 6) {
      error_log('[AUTH] ❌ Password too short');
      Response::json(['error'=>'La contraseña debe tener al menos 6 caracteres'], 400);
    }

    // Verificar si el documento ya existe
    try {
      $checkStmt = $pdo->prepare('SELECT id FROM users WHERE document=?');
      $checkStmt->execute([$document]);
      if ($checkStmt->fetch()) {
        error_log('[AUTH] ❌ Document already exists: ' . $document);
        Response::json(['error'=>'El documento ya está registrado'], 400);
      }
    } catch (Exception $e) {
      error_log('[AUTH] ❌ Error checking duplicate: ' . $e->getMessage());
      Response::json(['error'=>'Error verificando duplicados: ' . $e->getMessage()], 500);
      return;
    }

    // Campos opcionales
    $email = trim($in['email'] ?? '');
    $phone = trim($in['phone'] ?? '');

    // Crear usuario con rol "solicitante" por defecto
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $now = gmdate('c');

    $insertStmt = $pdo->prepare(
      'INSERT INTO users(document,name,password_hash,role,phone,email,person_type,created_at,updated_at) 
       VALUES(?,?,?,?,?,?,?,?,?)'
    );
    
    try {
      $insertStmt->execute([
        $document,
        $name,
        $passwordHash,
        'solicitante', // Rol por defecto
        $phone ?: null,
        $email ?: null,
        $personType,
        $now,
        $now
      ]);

      $userId = $pdo->lastInsertId();
      error_log('[AUTH] ✅ User created successfully with ID: ' . $userId);

      // Crear token de autenticación automáticamente
      $token = bin2hex(random_bytes(32));
      $exp = gmdate('c', time() + 7*24*3600); // 7 días
      $pdo->prepare('INSERT INTO auth_tokens(user_id,token,expires_at,created_at) VALUES(?,?,?,?)')
          ->execute([$userId,$token,$exp,$now]);

      error_log('[AUTH] ✅ Token created for user: ' . $userId);

      Response::json([
        'token'=>$token,
        'user'=>[
          'id'=>(int)$userId,
          'document'=>$document,
          'name'=>$name,
          'role'=>'solicitante'
        ]
      ]);
    } catch (Exception $e) {
      error_log('[AUTH] ❌ ERROR creating user or token: ' . $e->getMessage());
      Response::json(['error'=>'Error al crear la cuenta: ' . $e->getMessage()], 500);
      return;
    }
  }
}
