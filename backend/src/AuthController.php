<?php
declare(strict_types=1);

require_once __DIR__."/Response.php";
require_once __DIR__."/Database.php";
require_once __DIR__."/PasswordPolicy.php";

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
            throw new HttpException(401, 'unauthorized', 'No autenticado');
        }
        
        $pdo = Database::pdo();
        $tokenHash = hash('sha256', $token);
        
        $stmt = $pdo->prepare(
            'SELECT s.id AS session_id, u.* 
             FROM sessions s
             JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = ?
               AND s.revoked_at IS NULL
               AND s.expires_at > CURRENT_TIMESTAMP
               AND u.status = "active"
             LIMIT 1'
        );
        $stmt->execute([$tokenHash]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            try {
                $saStmt = $pdo->prepare('SELECT u.id, u.username as name FROM superadmin_tokens t JOIN superadmins u ON u.id = t.superadmin_id WHERE t.token = ? AND t.expires_at > CURRENT_TIMESTAMP LIMIT 1');
                $saStmt->execute([$tokenHash]);
                $saUser = $saStmt->fetch(PDO::FETCH_ASSOC);
                if ($saUser) {
                    $user = [
                        'id' => $saUser['id'],
                        'name' => $saUser['name'],
                        'document' => 'SUPERADMIN',
                        'role' => 'superadmin',
                        'email' => '',
                        'phone' => '',
                        'person_type' => 'natural',
                        'status' => 'active'
                    ];
                }
            } catch (PDOException $e) {
                // Si la tabla no existe en la base de datos de pruebas, ignoramos
            }
            
            if (!$user) {
                self::clearCookies();
                throw new HttpException(401, 'unauthorized', 'No autenticado');
            }
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
            $u = $pdo->prepare("SELECT * FROM users WHERE (document=? OR email=?) AND status='active'");
            $u->execute([$doc, $doc]);
            $user = $u->fetch(PDO::FETCH_ASSOC);

            if (!$user && preg_match("/^[VEJGP][-]?(.+)$/i", $doc, $m)) {
                $u->execute([$m[1], $m[1]]);
                $user = $u->fetch(PDO::FETCH_ASSOC);
            }

            if (!$user && !preg_match("/^[VEJGP]/i", $doc)) {
                $u->execute(['V'.$doc, 'V'.$doc]);
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

            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
            $pdo->prepare("INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, ip_address, created_at) VALUES (?, 'login', 'user', ?, ?, NOW())")
                ->execute([$user['id'], $user['document'], $ip]);

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
                "state" => $u["state"] ?? '',
                "municipality" => $u["municipality"] ?? '',
                "address" => $u["address"] ?? '',
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
            try {
                PasswordPolicy::validate($password);
            } catch (InvalidArgumentException $e) {
                Response::json(["error"=>$e->getMessage()], 400);
            }
            if ($email !== "" && !filter_var($email, FILTER_VALIDATE_EMAIL)) Response::json(["error"=>"Formato de correo electrónico inválido"], 400);

            $document = strtoupper(preg_replace('/[^A-Z0-9-]/i', '', $document));

            $check = $pdo->prepare("SELECT id FROM users WHERE document=?");
            $check->execute([$document]);
            if ($check->fetch()) Response::json(["error"=>"Documento ya registrado"], 400);

            $hash = PasswordPolicy::hash($password);
            $now = date("Y-m-d H:i:s");

            $plainToken = bin2hex(random_bytes(32));
            $tokenHash = hash('sha256', $plainToken);
            $ipHash = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? '');
            $userAgentHash = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');
            $expiresAt = date("Y-m-d H:i:s", time() + 604800);

            // Atomic: user + session in one transaction
            $pdo->beginTransaction();
            try {
                $ins = $pdo->prepare("INSERT INTO users(document,name,password_hash,role,phone,email,person_type,state,municipality,address,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)");
                $ins->execute([$document, $name, $hash, "solicitante", $phone, $email, $personType, $state, $municipality, $address, "active", $now, $now]);
                $uid = $pdo->lastInsertId();

                $pdo->prepare("INSERT INTO sessions (user_id, token_hash, ip_hash, user_agent_hash, expires_at) VALUES (?, ?, ?, ?, ?)") 
                    ->execute([$uid, $tokenHash, $ipHash, $userAgentHash, $expiresAt]);

                $pdo->commit();
            } catch (Throwable $txEx) {
                $pdo->rollBack();
                throw $txEx;
            }

            self::setSessionCookies($plainToken);

            // Send Welcome Email AFTER commit — a slow SMTP must not affect the user
            if ($email !== "") {
                try {
                    require_once __DIR__ . '/Services/EmailService.php';
                    EmailService::sendWelcome($email, $name);
                } catch (Throwable $mailEx) {
                    error_log("Failed to send welcome email: " . $mailEx->getMessage());
                }
            }

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

    public function forgotPassword(): void {
        try {
            $in = $this->jsonInput();
            $identifier = trim($in["identifier"] ?? $in["email"] ?? "");
            if ($identifier === "") {
                Response::json(["ok" => true, "message" => "Si la cuenta existe, recibirás instrucciones."], 200);
            }

            $pdo = Database::pdo();
            // Secure: only lookup by exact email, not name or document to avoid collisions
            $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE email=? AND status='active'");
            $stmt->execute([$identifier]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && !empty($user['email'])) {
                $email = $user['email'];
                $userId = $user['id'];
                
                $plainToken = bin2hex(random_bytes(32));
                $tokenHash = hash('sha256', $plainToken);
                $expiresAt = date("Y-m-d H:i:s", time() + 3600); // 1 hour

                // Delete previous tokens
                $pdo->prepare("DELETE FROM password_resets WHERE user_id=?")->execute([$userId]);
                
                $pdo->prepare("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)")
                    ->execute([$userId, $tokenHash, $expiresAt]);

                try {
                    require_once __DIR__ . '/Services/EmailService.php';
                    EmailService::sendPasswordReset($email, $user['name'], $plainToken);
                } catch (Throwable $mailEx) {
                    error_log("Failed to send password reset email: " . $mailEx->getMessage());
                    // Do not leak email failure to the client
                }
            }

            // Always return OK to prevent email enumeration
            Response::json(["ok" => true, "message" => "Si la cuenta existe, recibirás instrucciones."]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(["error" => "server_error", "message" => "Error interno"]);
            exit;
        }
    }

    public function resetPassword(): void {
        try {
            $in = $this->jsonInput();
            $token = trim($in["token"] ?? "");
            $password = (string)($in["password"] ?? "");

            if ($token === "" || $password === "") {
                Response::json(["error" => "Datos incompletos"], 400);
            }
            try {
                PasswordPolicy::validate($password);
            } catch (InvalidArgumentException $e) {
                Response::json(["error" => $e->getMessage()], 400);
            }

            $pdo = Database::pdo();
            $tokenHash = hash('sha256', $token);
            $now = date("Y-m-d H:i:s");

            // SELECT ... FOR UPDATE inside transaction to prevent race condition
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("SELECT id, user_id FROM password_resets WHERE token=? AND expires_at > ? AND used_at IS NULL ORDER BY id DESC LIMIT 1 FOR UPDATE");
                $stmt->execute([$tokenHash, $now]);
                $reset = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$reset) {
                    $pdo->rollBack();
                    Response::json(["error" => "Enlace inválido o expirado"], 400);
                }

                $userId = $reset['user_id'];
                $resetId = $reset['id'];
                $passwordHash = PasswordPolicy::hash($password);

                $pdo->prepare("UPDATE users SET password_hash=?, updated_at=? WHERE id=? AND status='active'")
                    ->execute([$passwordHash, $now, $userId]);

                // Verify the update actually affected a row (account could be suspended)
                $affected = $pdo->query("SELECT ROW_COUNT()")->fetchColumn();
                if ((int)$affected === 0) {
                    $pdo->rollBack();
                    Response::json(["error" => "La cuenta no está activa"], 400);
                }

                // Consume token
                $pdo->prepare("UPDATE password_resets SET used_at=? WHERE id=?")->execute([$now, $resetId]);
                // Invalidate all remaining tokens for this user
                $pdo->prepare("DELETE FROM password_resets WHERE user_id=?")->execute([$userId]);
                // Revoke all sessions for security
                $pdo->prepare("UPDATE sessions SET revoked_at=NOW() WHERE user_id=?")->execute([$userId]);

                $pdo->commit();
                Response::json(["ok" => true]);
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(["error" => "server_error", "message" => "Error interno"]);
            exit;
        }
    }

    public function superadminLogin(): void {
        try {
            $pdo = Database::pdo();
            $in = $this->jsonInput();
            $username = trim($in["username"] ?? "");
            $pass = (string)($in["password"] ?? "");
            
            if (empty($username) || empty($pass)) {
                Response::json(["error"=>"invalid_credentials"], 401);
            }
            
            $this->checkRateLimit("sa_" . $username);
            $stmt = $pdo->prepare("SELECT * FROM superadmins WHERE username=?");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user || !password_verify($pass, $user["password_hash"])) {
                $this->recordFailedAttempt("sa_" . $username);
                Response::json(["error"=>"invalid_credentials"], 401);
            }

            $plainToken = bin2hex(random_bytes(32));
            $tokenHash = hash('sha256', $plainToken);
            $expiresAt = date("Y-m-d H:i:s", time() + 604800);
            
            $pdo->prepare("INSERT INTO superadmin_tokens (superadmin_id, token, expires_at, created_at) VALUES (?, ?, ?, NOW())")
                ->execute([$user["id"], $tokenHash, $expiresAt]);

            self::setSessionCookies($plainToken);

            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
            $pdo->prepare("INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, ip_address, created_at) VALUES (NULL, 'login', 'superadmin', ?, ?, NOW())")
                ->execute([$username, $ip]);

            Response::json([
                "token" => $plainToken,
                "superadmin" => [ 
                    "id" => (int)$user["id"], 
                    "username" => $user["username"]
                ]
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(["error" => "server_error", "message" => "Error interno"]);
            exit;
        }
    }

    public function verifySuperAdmin(): void {
        try {
            $token = self::sessionToken() ?? str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION'] ?? '');
            if (!$token) throw new Exception();

            $pdo = Database::pdo();
            $tokenHash = hash('sha256', $token);
            $stmt = $pdo->prepare("
                SELECT u.id, u.username 
                FROM superadmin_tokens t
                JOIN superadmins u ON u.id = t.superadmin_id
                WHERE t.token = ? AND t.expires_at > NOW()
            ");
            $stmt->execute([$tokenHash]);
            $sa = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$sa) throw new Exception();
            Response::json(["ok" => true, "superadmin" => $sa]);
        } catch (Throwable $e) {
            Response::json(["error" => "unauthorized"], 401);
        }
    }

    public function superadminLogout(): void {
        try {
            $token = self::sessionToken();
            if ($token) {
                $pdo = Database::pdo();
                $tokenHash = hash('sha256', $token);
                // Revoke superadmin token
                $pdo->prepare("DELETE FROM superadmin_tokens WHERE token=?")->execute([$tokenHash]);
                // Also revoke regular session if one exists
                $pdo->prepare("UPDATE sessions SET revoked_at=NOW() WHERE token_hash=?")->execute([$tokenHash]);
            }
            self::clearCookies();
            Response::json(["ok" => true]);
        } catch (Throwable $e) {
            self::clearCookies();
            Response::json(["ok" => true]);
        }
    }
}

