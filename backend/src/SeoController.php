<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';
require_once __DIR__.'/AuthController.php';

class SeoController {
    
    private function ensureTableExists() {
        $pdo = Database::pdo();
        $sql = "CREATE TABLE IF NOT EXISTS seo_metadata (
            path VARCHAR(255) PRIMARY KEY,
            title VARCHAR(255),
            description TEXT,
            og_image VARCHAR(255),
            robots VARCHAR(50) DEFAULT 'index, follow',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )";
        $pdo->exec($sql);
    }

    private function requireAdmin() {
        $u = AuthController::requireAuth();
        if ($u['role'] !== 'admin' && $u['role'] !== 'superadmin') {
            Response::json(["error"=>"forbidden", "details"=>"No autorizado"], 403);
            exit;
        }
        return $u;
    }

    public function getAllPublic() {
        try {
            $this->ensureTableExists();
            $pdo = Database::pdo();
            $stmt = $pdo->query("SELECT path, title, description, og_image, robots FROM seo_metadata");
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Map by path for easy O(1) lookup on frontend
            $map = [];
            foreach ($items as $item) {
                $map[$item['path']] = $item;
            }
            Response::json(['seo' => $map]);
        } catch (Exception $e) {
            Response::json(['error' => 'server_error'], 500);
        }
    }

    public function listAll() {
        $this->requireAdmin();
        try {
            $this->ensureTableExists();
            $pdo = Database::pdo();
            $stmt = $pdo->query("SELECT * FROM seo_metadata ORDER BY updated_at DESC");
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            Response::json(['items' => $items]);
        } catch (Exception $e) {
            Response::json(['error' => 'server_error'], 500);
        }
    }

    public function save() {
        $u = $this->requireAdmin();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        
        $path = trim($input['path'] ?? '');
        if (!$path) {
            Response::json(['error' => 'La ruta (path) es obligatoria'], 400);
            return;
        }
        
        if (!str_starts_with($path, '/')) {
            $path = '/' . $path;
        }
        
        $title = $input['title'] ?? null;
        $description = $input['description'] ?? null;
        $og_image = $input['og_image'] ?? null;
        $robots = $input['robots'] ?? 'index, follow';
        $now = gmdate('c');

        try {
            $this->ensureTableExists();
            $pdo = Database::pdo();
            
            // Check if exists
            $check = $pdo->prepare("SELECT path FROM seo_metadata WHERE path = ?");
            $check->execute([$path]);
            $exists = $check->fetchColumn();
            
            if ($exists) {
                $stmt = $pdo->prepare("UPDATE seo_metadata SET title=?, description=?, og_image=?, robots=?, updated_at=? WHERE path=?");
                $stmt->execute([$title, $description, $og_image, $robots, $now, $path]);
                $action = 'update_seo';
            } else {
                $stmt = $pdo->prepare("INSERT INTO seo_metadata (path, title, description, og_image, robots, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$path, $title, $description, $og_image, $robots, $now, $now]);
                $action = 'create_seo';
            }
            
            // Audit log
            $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
                ->execute([$u['id'], $action, 'seo_metadata', $path]);
                
            Response::json(['ok' => true]);
        } catch (Exception $e) {
            Response::json(['error' => 'Error al guardar metadata SEO'], 500);
        }
    }

    public function delete() {
        $u = $this->requireAdmin();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $path = $input['path'] ?? '';
        
        if (!$path) {
            Response::json(['error' => 'Ruta obligatoria'], 400);
            return;
        }
        
        try {
            $this->ensureTableExists();
            $pdo = Database::pdo();
            $stmt = $pdo->prepare("DELETE FROM seo_metadata WHERE path = ?");
            $stmt->execute([$path]);
            
            $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
                ->execute([$u['id'], 'delete_seo', 'seo_metadata', $path]);
                
            Response::json(['ok' => true]);
        } catch (Exception $e) {
            Response::json(['error' => 'Error al eliminar'], 500);
        }
    }
}
