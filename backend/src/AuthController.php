<?php
require_once __DIR__."/Response.php";
require_once __DIR__."/Database.php";

class AuthController {
  private function jsonInput(){
    $raw = file_get_contents("php://input");
    return json_decode($raw, true) ?: [];
  }

  public static function bearerToken(): ?string {
    $h = $_SERVER["HTTP_AUTHORIZATION"] ?? $_SERVER["REDIRECT_HTTP_AUTHORIZATION"] ?? null;
    return ($h && preg_match("/^Bearer\s+(.*)$/i", $h, $m)) ? trim($m[1]) : ($_GET["token"] ?? null);
  }

  public static function requireAuth(){
    $token = self::bearerToken();
    if (!$token) { http_response_code(401); echo json_encode(["error"=>"unauthorized"]); exit; }
    $pdo = Database::pdo();
    $stmt = $pdo->prepare("SELECT u.* FROM auth_tokens t JOIN users u ON u.id=t.user_id WHERE t.token=? AND t.expires_at > NOW()");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) { http_response_code(401); echo json_encode(["error"=>"unauthorized"]); exit; }
    return $user;
  }
  
  public static function userFromToken(?string $token){
    if (!$token) return null;
    $pdo = Database::pdo();
    $stmt = $pdo->prepare("SELECT u.id,u.document,u.name,u.role FROM auth_tokens t JOIN users u ON u.id=t.user_id WHERE t.token=? AND t.expires_at > NOW()");
    $stmt->execute([$token]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
  }

  public function login(){
    $pdo = Database::pdo();
    $in = $this->jsonInput();
    $doc = trim($in["document"] ?? "");
    $pass = (string)($in["password"] ?? "");
    
    $u = $pdo->prepare("SELECT * FROM users WHERE document=?");
    $u->execute([$doc]);
    $user = $u->fetch(PDO::FETCH_ASSOC);

    if (!$user && preg_match("/^[VEJGP][0-9]+/i", $doc)) {
         $u->execute([substr($doc, 1)]);
         $user = $u->fetch(PDO::FETCH_ASSOC);
    }

    if (!$user || !password_verify($pass, $user["password_hash"])) {
       Response::json(["error"=>"invalid_credentials"], 401);
    }

    $token = bin2hex(random_bytes(32));
    $pdo->prepare("INSERT INTO auth_tokens(user_id,token,expires_at,created_at) VALUES(?,?,?,?)")
        ->execute([$user["id"], $token, gmdate("c", time()+604800), gmdate("c")]);

    Response::json([
      "token"=>$token,
      "user"=>[ "id"=>(int)$user["id"], "document"=>$user["document"], "name"=>$user["name"], "role"=>$user["role"] ]
    ]);
  }
  
  public function me(){
     $u = self::requireAuth();
     Response::json(["user"=>[
      "id"=>(int)$u["id"], "document"=>$u["document"], "name"=>$u["name"], "role"=>$u["role"], "avatar_url"=>$u["avatar_url"]??null
    ]]);
  }

  public function logout(){ Response::json(["ok"=>true]); }
  
  public function register(){
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
    $now = gmdate("c");
    $ins = $pdo->prepare("INSERT INTO users(document,name,password_hash,role,phone,email,person_type,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)");
    $ins->execute([$document, $name, $hash, "solicitante", $phone, $email, $personType, $now, $now]);
    
    $uid = $pdo->lastInsertId();
    $token = bin2hex(random_bytes(32));
    $pdo->prepare("INSERT INTO auth_tokens(user_id,token,expires_at,created_at) VALUES(?,?,?,?)")
        ->execute([$uid, $token, gmdate("c", time()+604800), $now]);

    Response::json([
      "token"=>$token,
      "user"=>[ "id"=>(int)$uid, "document"=>$document, "name"=>$name, "role"=>"solicitante" ]
    ]);
  }
}
