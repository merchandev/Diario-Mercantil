<?php
require_once __DIR__."/Response.php";
require_once __DIR__."/Database.php";

class AuthController {
  private function jsonInput(){ return json_decode(file_get_contents("php://input"), true) ?: []; }
  
  /**
   * Simple rate limiting to prevent brute force attacks
   * Max 5 login attempts per document per 15 minutes
   */
  private function checkRateLimit(string $identifier): void {
    $cacheDir = getenv('UPLOAD_DIR') ? dirname(getenv('UPLOAD_DIR')) . '/cache' : __DIR__ . '/../storage/cache';
    if (!is_dir($cacheDir)) mkdir($cacheDir, 0775, true);
    
    $key = md5($identifier);
    $file = $cacheDir . '/login_' . $key;
    
    $attempts = [];
    if (file_exists($file)) {
      $attempts = json_decode(file_get_contents($file), true) ?: [];
    }
    
    // Remove attempts older than 15 minutes
    $cutoff = time() - (15 * 60);
    $attempts = array_filter($attempts, fn($t) => $t > $cutoff);
    
    if (count($attempts) >= 5) {
      error_log("Rate limit exceeded for login attempt: $identifier");
      http_response_code(429);
      echo json_encode(["error" => "too_many_attempts", "message" => "Too many login attempts. Please try again later."]);
      exit;
    }
  }
  
  private function recordFailedAttempt(string $identifier): void {
    $cacheDir = getenv('UPLOAD_DIR') ? dirname(getenv('UPLOAD_DIR')) . '/cache' : __DIR__ . '/../storage/cache';
    if (!is_dir($cacheDir)) mkdir($cacheDir, 0775, true);
    
    $key = md5($identifier);
    $file = $cacheDir . '/login_' . $key;
    
    $attempts = [];
    if (file_exists($file)) {
      $attempts = json_decode(file_get_contents($file), true) ?: [];
    }
    
    $attempts[] = time();
    file_put_contents($file, json_encode($attempts));
  }

  public static function bearerToken(): ?string {
    // Try all possible headers (Apache/Nginx sometimes strip Authorization)
    $h = $_SERVER["HTTP_AUTHORIZATION"] 
      ?? $_SERVER["REDIRECT_HTTP_AUTHORIZATION"] 
      ?? $_SERVER["HTTP_X_AUTHORIZATION"] // Sometimes used as workaround
      ?? $_SERVER["HTTP_X_AUTH_TOKEN"] // Our custom failover
      ?? null;
      
    if (!$h && function_exists("getallheaders")) {
        $headers = getallheaders();
        $h = $headers["Authorization"] 
            ?? $headers["authorization"] 
            ?? $headers["X-Auth-Token"] // Check headers directly
            ?? null;
    }
    
    
    // Debug to stderr (Redacted)
    // error_log("🔍 [bearerToken] Auth Header: " . ($h ? substr($h,0,50)."..." : "NULL"));

    // If header exists, try to extract Bearer or just use the whole value if it looks like a token
    if ($h) {
        if (preg_match("/^Bearer\s+(.*)$/i", $h, $m)) {
            $token = trim($m[1]);
        } else {
            $token = trim($h);
        }
    } else {
        $token = null; // Tokens in URL disabled for security
    }
    
    // Safety check for "null" string literal coming from buggy clients
    if ($token === "null" || $token === "undefined") {
        return null;
    }

    return $token;
  }

    public static function requireAuth(){
    $token = self::bearerToken();
    if (!$token) { 
        http_response_code(401); 
        echo json_encode(["error"=>"unauthorized", "message"=>"Sesión inválida o vencida"]); 
        exit; 
    }
    
    $pdo = Database::pdo();
    
    // 1. Try Normal User Token
    // Use simple query first
    $stmt = $pdo->prepare("SELECT u.*, t.expires_at FROM auth_tokens t JOIN users u ON u.id=t.user_id WHERE t.token=? AND u.status='active' AND u.deleted_at IS NULL");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        // Check expiry (Server Time vs DB Time)
        // Convert both to timestamps to be safe
        if (strtotime($user["expires_at"]) <= time()) {
             http_response_code(401); 
             echo json_encode(["error"=>"unauthorized", "message"=>"Sesión inválida o vencida"]); 
             exit;
        }
        return $user;
    }

    // 2. Try SuperAdmin Token (Fallback for Admin Panel operations)
    $stmt = $pdo->prepare("SELECT s.id, s.username, t.expires_at FROM superadmin_tokens t JOIN superadmins s ON s.id=t.superadmin_id WHERE t.token=?");
    $stmt->execute([$token]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($admin) {
         if (strtotime($admin["expires_at"]) <= time()) {
             http_response_code(401); 
             echo json_encode(["error"=>"unauthorized", "message"=>"Sesión inválida o vencida"]); 
             exit;
        }
        // Return a mock user structure compatible with controllers
        return [
            "id" => $admin['id'],
            "document" => "SUPERADMIN",
            "name" => $admin['username'],
            "role" => "superadmin", // Special role
            "email" => "",
            "phone" => ""
        ];
    }

    // If neither
    http_response_code(401); 
    echo json_encode(["error"=>"unauthorized", "message"=>"Sesión inválida o vencida"]);
    exit;
  }
  
  public static function userFromToken(?string $token){
    if (!$token) return null;
    return (new self())->requireAuth(); // Reuse logic
  }

  public function login(){
    try {
        $pdo = Database::pdo();
        $in = $this->jsonInput();
        $doc = trim($in["document"] ?? "");
        $pass = (string)($in["password"] ?? "");
        
        // Input validation
        if (empty($doc) || empty($pass)) {
            error_log("Login attempt with empty credentials");
            Response::json(["error"=>"invalid_credentials"], 401);
        }
        
        // Rate limiting: Simple implementation using filesystem
        $this->checkRateLimit($doc);
        
        // Try multiple document formats for flexible login
        $u = $pdo->prepare("SELECT * FROM users WHERE document=? AND status='active' AND deleted_at IS NULL");
        $u->execute([$doc]);
        $user = $u->fetch(PDO::FETCH_ASSOC);

        // If not found, try stripping prefix (V123456 -> 123456)
        if (!$user && preg_match("/^[VEJGP][-]?(.+)$/i", $doc, $m)) {
            $u->execute([$m[1]]);
            $user = $u->fetch(PDO::FETCH_ASSOC);
        }

        // If still not found and doc has no prefix, try adding V prefix (123456 -> V123456)
        if (!$user && !preg_match("/^[VEJGP]/i", $doc)) {
            $u->execute(['V'.$doc]);
            $user = $u->fetch(PDO::FETCH_ASSOC);
        }

        if (!$user) {
           error_log("Login failed: User not found or inactive for doc: $doc");
           $this->recordFailedAttempt($doc);
           Response::json(["error"=>"invalid_credentials"], 401);
        }

        if (!password_verify($pass, $user["password_hash"])) {
           error_log("Login failed: Password mismatch for doc: $doc");
           $this->recordFailedAttempt($doc);
           Response::json(["error"=>"invalid_credentials"], 401);
        }

        // IMPORTANT: Use MySQL-safe datetime format Y-m-d H:i:s
        $token = bin2hex(random_bytes(32));
        $expiry = gmdate("Y-m-d H:i:s", time() + 604800); // 7 days
        $now = gmdate("Y-m-d H:i:s");
        
        $pdo->prepare("INSERT INTO auth_tokens(user_id,token,expires_at,created_at) VALUES(?,?,?,?)")
            ->execute([$user["id"], $token, $expiry, $now]);

        Response::json([
          "token"=>$token,
          "user"=>[ "id"=>(int)$user["id"], "document"=>$user["document"], "name"=>$user["name"], "role"=>$user["role"] ]
        ]);
    } catch (Throwable $e) {
        // Force JSON response even on fatal errors
        http_response_code(500);
        echo json_encode(["error" => "server_error", "message" => "Error interno de autenticación"]);
        exit;
    }
  }
  
  public function me(){
     $u = self::requireAuth();
     Response::json(["user"=>[
      "id"=>(int)$u["id"], 
      "document"=>$u["document"], 
      "name"=>$u["name"], 
      "role"=>$u["role"], 
      "email"=>$u["email"],
      "phone"=>$u["phone"],
      "state"=>$u["state"],
      "municipality"=>$u["municipality"],
      "address"=>$u["address"],
      "person_type"=>$u["person_type"],
      "avatar_url"=>$u["avatar_url"]??null
    ]]);
  }

  public function logout(){ 
      $token = self::bearerToken();
      if ($token) {
          $pdo = Database::pdo();
          $pdo->prepare("DELETE FROM auth_tokens WHERE token=?")->execute([$token]);
          $pdo->prepare("DELETE FROM superadmin_tokens WHERE token=?")->execute([$token]);
      }
      Response::json(["ok"=>true]); 
  }
  
  public function register(){
    try {
        $pdo = Database::pdo();
        $in = $this->jsonInput();
        $document = trim($in["document"] ?? "");
        $name = trim($in["name"] ?? "");
        $password = (string)($in["password"] ?? "");
        $personType = trim($in["person_type"] ?? "natural");
        $email = trim($in["email"] ?? "");
        $phone = trim($in["phone"] ?? "");

        $state = trim($in["state"] ?? "");
        $municipality = trim($in["municipality"] ?? "");
        $address = trim($in["address"] ?? "");

        if ($document === "" || $name === "" || $password === "") Response::json(["error"=>"Faltan datos requeridos"], 400);
        
        if (strlen($password) < 6) Response::json(["error"=>"La contraseña debe tener al menos 6 caracteres"], 400);
        
        if ($email !== "" && !filter_var($email, FILTER_VALIDATE_EMAIL)) Response::json(["error"=>"Formato de correo electrónico inválido"], 400);
        
        $document = strtoupper(preg_replace('/[^A-Z0-9-]/i', '', $document));
        
        $check = $pdo->prepare("SELECT id FROM users WHERE document=?");
        $check->execute([$document]);
        if ($check->fetch()) Response::json(["error"=>"Documento ya registrado"], 400);

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $now = gmdate("Y-m-d H:i:s");
        $ins = $pdo->prepare("INSERT INTO users(document,name,password_hash,role,phone,email,person_type,state,municipality,address,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $ins->execute([$document, $name, $hash, "solicitante", $phone, $email, $personType, $state, $municipality, $address, "active", $now, $now]);
        
        $uid = $pdo->lastInsertId();
        $token = bin2hex(random_bytes(32));
        $expiry = gmdate("Y-m-d H:i:s", time() + 604800); // 7 days
        
        $pdo->prepare("INSERT INTO auth_tokens(user_id,token,expires_at,created_at) VALUES(?,?,?,?)")
            ->execute([$uid, $token, $expiry, $now]);

        Response::json([
          "token"=>$token,
          "user"=>[ "id"=>(int)$uid, "document"=>$document, "name"=>$name, "role"=>"solicitante" ]
        ]);
    } catch (Throwable $e) {
        // Force JSON response even on fatal errors
        http_response_code(500);
        echo json_encode(["error" => "server_error", "message" => "Error interno al registrar usuario"]);
        exit;
    }
  }
}
