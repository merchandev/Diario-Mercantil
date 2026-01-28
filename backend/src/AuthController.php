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
      ?? null;
      
    if (!$h && function_exists("getallheaders")) {
        $headers = getallheaders();
        $h = $headers["Authorization"] ?? $headers["authorization"] ?? null;
    }
    
    // Debug to stderr
    // file_put_contents("php://stderr", "Auth Header: " . ($h ? substr($h,0,10)."..." : "NULL") . "\n", FILE_APPEND);

    return ($h && preg_match("/^Bearer\s+(.*)$/i", $h, $m)) ? trim($m[1]) : ($_GET["token"] ?? null);
  }

    public static function requireAuth(){
    $token = self::bearerToken();
    if (!$token) { 
        http_response_code(401); 
        echo json_encode(["error"=>"unauthorized_no_token_found", "debug"=>"Header missing and no query param"]); 
        exit; 
    }
    
    $pdo = Database::pdo();
    
    // 1. Try Normal User Token
    // Use simple query first
    $stmt = $pdo->prepare("SELECT u.*, t.expires_at FROM auth_tokens t JOIN users u ON u.id=t.user_id WHERE t.token=?");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        // Check expiry (Server Time vs DB Time)
        // Convert both to timestamps to be safe
        if (strtotime($user["expires_at"]) <= time()) {
             http_response_code(401); 
             echo json_encode([
                 "error"=>"unauthorized_expired", 
                 "expiry"=>$user["expires_at"], 
                 "now"=>gmdate("Y-m-d H:i:s")
             ]); 
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
             echo json_encode(["error"=>"unauthorized_expired"]); 
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
    echo json_encode(["error"=>"unauthorized_invalid_token", "received_token_preview" => substr($token,0,5)."..."]);
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
        
        // ADMIN OVERRIDE: Prevent conflicts. "merchandev" is always "merchandev" regardless of prefix (V, E, J...)
        if (stripos($doc, 'merchandev') !== false) {
            $doc = 'merchandev';
        }
        
        $u = $pdo->prepare("SELECT * FROM users WHERE document=?");
        $u->execute([$doc]);
        $user = $u->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            // Attempt to strip prefix V, E, J, G, P if followed by alphanumeric
            if (preg_match("/^[VEJGP](.+)$/i", $doc, $m)) {
                 $u->execute([$m[1]]);
                 $user = $u->fetch(PDO::FETCH_ASSOC);
            }
        }

        if (!$user) {
           error_log("Login failed: User not found for doc: $doc");
           $this->recordFailedAttempt($doc);
           Response::json(["error"=>"invalid_credentials"], 401);
        }

        if (!password_verify($pass, $user["password_hash"])) {
           error_log("Login failed: Password mismatch for doc: $doc. Hash len: " . strlen($user['password_hash']));
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
        echo json_encode(["error" => "server_error", "message" => $e->getMessage()]);
        exit;
    }
  }
  
  public function me(){
     $u = self::requireAuth();
     Response::json(["user"=>[
      "id"=>(int)$u["id"], "document"=>$u["document"], "name"=>$u["name"], "role"=>$u["role"], "avatar_url"=>$u["avatar_url"]??null
    ]]);
  }

  public function logout(){ Response::json(["ok"=>true]); }
  
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

        if ($document === "" || $name === "" || $password === "") Response::json(["error"=>"Faltan datos requeridos"], 400);
        
        $check = $pdo->prepare("SELECT id FROM users WHERE document=?");
        $check->execute([$document]);
        if ($check->fetch()) Response::json(["error"=>"Documento ya registrado"], 400);

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $now = gmdate("Y-m-d H:i:s");
        $ins = $pdo->prepare("INSERT INTO users(document,name,password_hash,role,phone,email,person_type,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)");
        $ins->execute([$document, $name, $hash, "solicitante", $phone, $email, $personType, $now, $now]);
        
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
        echo json_encode(["error" => "server_error", "message" => $e->getMessage()]);
        exit;
    }
  }
}
