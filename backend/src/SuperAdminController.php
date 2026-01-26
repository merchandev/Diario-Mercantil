<?php
/**
 * SuperAdminController
 * Handles authentication and operations for superadministrators
 * Completely separate from regular user authentication
 */

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Response.php';

class SuperAdminController {
    
    /**
     * Login endpoint for superadmins
     * POST /api/superadmin/login
     * Body: { "username": "merchandev", "password": "G0ku*1896" }
     */
    public function login() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $username = $input['username'] ?? '';
            $password = $input['password'] ?? '';
            
            if (empty($username) || empty($password)) {
                error_log("Superadmin login attempt with empty credentials");
                Response::json(['error' => 'invalid_credentials'], 401);
            }
            
            // Get superadmin from database
            $pdo = Database::pdo();
            $stmt = $pdo->prepare("SELECT * FROM superadmins WHERE username = ?");
            $stmt->execute([$username]);
            $superadmin = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$superadmin || !password_verify($password, $superadmin['password_hash'])) {
                error_log("Failed superadmin login for $username from IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
                Response::json(['error' => 'invalid_credentials'], 401);
            }
            
            // Generate token
            $token = bin2hex(random_bytes(32));
            $expiresAt = date('Y-m-d H:i:s', time() + 86400 * 7); // 7 days
            
            $stmt = $pdo->prepare(
                "INSERT INTO superadmin_tokens (superadmin_id, token, expires_at, created_at) 
                 VALUES (?, ?, ?, NOW())"
            );
            $stmt->execute([$superadmin['id'], $token, $expiresAt]);
            
            error_log("Successful superadmin login for $username");
            
            Response::json([
                'token' => $token,
                'superadmin' => [
                    'id' => $superadmin['id'],
                    'username' => $superadmin['username']
                ]
            ]);
        } catch (Exception $e) {
            // SECURITY: Never expose internal errors
            error_log("Superadmin login error: " . $e->getMessage());
            Response::json(['error' => 'server_error'], 500);
        }
    }
    
    /**
     * Verify superadmin token
     * GET /api/superadmin/verify
     * Header: Authorization: Bearer {token}
     */
    public function verify() {
        $superadmin = $this->requireSuperAdmin();
        
        Response::json([
            'valid' => true,
            'superadmin' => [
                'id' => $superadmin['id'],
                'username' => $superadmin['username']
            ]
        ]);
    }
    
    /**
     * Logout superadmin
     * POST /api/superadmin/logout
     */
    public function logout() {
        $token = $this->getBearerToken();
        
        if ($token) {
            $pdo = Database::pdo();
            $stmt = $pdo->prepare("DELETE FROM superadmin_tokens WHERE token = ?");
            $stmt->execute([$token]);
        }
        
        Response::json(['message' => 'logged_out']);
    }
    
    /**
     * Middleware: Require superadmin authentication
     * Returns superadmin data if valid, exits with 401 if not
     */
    public function requireSuperAdmin() {
        $token = $this->getBearerToken();
        
        if (!$token) {
            Response::json(['error' => 'unauthorized'], 401);
        }
        
        $pdo = Database::pdo();
        $stmt = $pdo->prepare("
            SELECT s.* FROM superadmins s
            JOIN superadmin_tokens t ON s.id = t.superadmin_id
            WHERE t.token = ? AND t.expires_at > NOW()
        ");
        $stmt->execute([$token]);
        $superadmin = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$superadmin) {
            Response::json(['error' => 'unauthorized'], 401);
        }
        
        return $superadmin;
    }
    
    /**
     * Get bearer token from Authorization header
     */
    private function getBearerToken() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
        
        return null;
    }
}
