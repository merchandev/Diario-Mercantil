<?php
declare(strict_types=1);

require_once __DIR__."/Response.php";
require_once __DIR__."/Database.php";

final class AuthController {
    private function jsonInput(): array {
        return json_decode(file_get_contents("php://input"), true) ?: [];
    }

    private function checkRateLimit(string $identifier): void {
        $cacheDir = getenv('UPLOAD_DIR') ? dirname(getenv('UPLOAD_DIR')) . '/cache' : __DIR__ . '/../storage/cache';
        if (!is_dir($cacheDir)) mkdir($cacheDir, 0775, true);
        
        $key = md5($identifier);
        $file = $cacheDir . '/login_' . $key;
        
        $attempts = [];
        if (file_exists($file)) {
            $attempts = json_decode(file_get_contents($file), true) ?: [];
        }
        
        $cutoff = time() - (15 * 60);
        $attempts = array_filter($attempts, fn($t) => $t > $cutoff);
        
        if (count($attempts) >= 5) {
            error_log("Rate limit exceeded for login attempt: $identifier");
            http_response_code(429);
            echo json_encode(["error" => "too_many_attempts", "message" => "Demasiados intentos. Intente más tarde."]);
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

    public static function sessionToken(): ?string {
        return $_COOKIE['dm_session'] ?? null;
    }

    public static function requireAuth(): array {
        $token = self::sessionToken();
        if (!$token) { 
            throw new RuntimeException('unauthorized', 401);
        }
        
        $pdo = Database::pdo();
        $tokenHash = hash('sha256', $token);
        
        $stmt = $pdo->prepare(
            'SELECT s.id AS session_id, u.* 
             FROM sessions s
             JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = ?
               AND s.revoked_at IS NULL
               AND s.expires_at > NOW()
               AND u.deleted_at IS NULL
               AND u.status = "active"
             LIMIT 1'
        );
        $stmt->execute([$tokenHash]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            self::clearCookies();
            throw new RuntimeException('unauthorized', 401);
        }

        return $user;
    }
    
    public static function userFromToken(): ?array {
        try {
            return self::requireAuth();
        } catch (Throwable $e) {
            return null;
        }
    }

    public static function setSessionCookies(string $token): void {
        $csrfToken = bin2hex(random_bytes(32));
        
        setcookie("dm_session", $token, [
            'expires' => time() + 604800,
            'path' => '/',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        
        // CSRF cookie is NOT HttpOnly so JS can read it and send it in headers
        setcookie("dm_csrf", $csrfToken, [
            'expires' => time() + 604800,
            'path' => '/',
            'secure' => true,
            'httponly' => false,
            'samesite' => 'Lax'
        ]);
    }

    public static function clearCookies(): void {
        setcookie("dm_session", "", [
            'expires' => 1,
            'path' => '/',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        setcookie("dm_csrf", "", [
            'expires' => 1,
            'path' => '/',
            'secure' => true,
            'httponly' => false,
            'samesite' => 'Lax'
        ]);
    }

    public function login(): void {
        try {
            $pdo = Database::pdo();
            $in = $this->jsonInput();
            $doc = trim($in["document"] ?? "");
            $pass = (string)($in["password"] ?? "");
            
            if (empty($doc) || empty($pass)) {
                Response::json(["error"=>"invalid_credentials"], 401);
            }
            
            $this->checkRateLimit($doc);
            
            $u = $pdo->prepare("SELECT * FROM users WHERE document=? AND status='active' AND deleted_at IS NULL");
            $u->execute([$doc]);
            $user = $u->fetch(PDO::FETCH_ASSOC);

            if (!$user && preg_match("/^[VEJGP][-]?(.+)$/i", $doc, $m)) {
                $u->execute([$m[1]]);
                $user = $u->fetch(PDO::FETCH_ASSOC);
            }

            if (!$user && !preg_match("/^[VEJGP]/i", $doc)) {
                $u->execute(['V'.$doc]);
                $user = $u->fetch(PDO::FETCH_ASSOC);
            }

            if (!$user || !password_verify($pass, $user["password_hash"])) {
                $this->recordFailedAttempt($doc);
                Response::json(["error"=>"invalid_credentials"], 401);
            }

            $plainToken = bin2hex(random_bytes(32));
            $tokenHash = hash('sha256', $plainToken);
            $ipHash = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? '');
            $userAgentHash = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');
            $expiresAt = date("Y-m-d H:i:s", time() + 604800);
            
            $pdo->prepare("INSERT INTO sessions (user_id, token_hash, ip_hash, user_agent_hash, expires_at) VALUES (?, ?, ?, ?, ?)")
                ->execute([$user["id"], $tokenHash, $ipHash, $userAgentHash, $expiresAt]);

            self::setSessionCookies($plainToken);

            Response::json([
                "user" => [ 
                    "id" => (int)$user["id"], 
                    "document" => $user["document"], 
                    "name" => $user["name"], 
                    "role" => $user["role"] 
                ]
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(["error" => "server_error", "message" => "Error interno de autenticación"]);
            exit;
        }
    }
    
    public function me(): void {
        try {
            $u = self::requireAuth();
            Response::json(["user"=>[
                "id" => (int)$u["id"], 
                "document" => $u["document"], 
                "name" => $u["name"], 
                "role" => $u["role"], 
                "email" => $u["email"],
                "phone" => $u["phone"],
                "state" => $u["state"],
                "municipality" => $u["municipality"],
                "address" => $u["address"],
                "person_type" => $u["person_type"],
                "avatar_url" => $u["avatar_url"] ?? null
            ]]);
        } catch (Throwable $e) {
            Response::json(["error" => "unauthorized"], 401);
        }
    }

    public function logout(): void { 
        $token = self::sessionToken();
        if ($token) {
            $pdo = Database::pdo();
            $tokenHash = hash('sha256', $token);
            $pdo->prepare("UPDATE sessions SET revoked_at = NOW() WHERE token_hash = ?")->execute([$tokenHash]);
        }
        self::clearCookies();
        Response::json(["ok"=>true]); 
    }
    
    public function register(): void {
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
            $now = date("Y-m-d H:i:s");
            
            $ins = $pdo->prepare("INSERT INTO users(document,name,password_hash,role,phone,email,person_type,state,municipality,address,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $ins->execute([$document, $name, $hash, "solicitante", $phone, $email, $personType, $state, $municipality, $address, "active", $now, $now]);
            
            $uid = $pdo->lastInsertId();
            
            $plainToken = bin2hex(random_bytes(32));
            $tokenHash = hash('sha256', $plainToken);
            $ipHash = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? '');
            $userAgentHash = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');
            $expiresAt = date("Y-m-d H:i:s", time() + 604800);
            
            $pdo->prepare("INSERT INTO sessions (user_id, token_hash, ip_hash, user_agent_hash, expires_at) VALUES (?, ?, ?, ?, ?)")
                ->execute([$uid, $tokenHash, $ipHash, $userAgentHash, $expiresAt]);

            self::setSessionCookies($plainToken);

            Response::json([
                "user" => [ 
                    "id" => (int)$uid, 
                    "document" => $document, 
                    "name" => $name, 
                    "role" => "solicitante" 
                ]
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(["error" => "server_error", "message" => "Error interno al registrar usuario"]);
            exit;
        }
    }
}
