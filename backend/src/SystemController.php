<?php
require_once __DIR__."/Response.php";
require_once __DIR__."/Database.php";
require_once __DIR__."/AuthController.php";
require_once __DIR__."/Http/SettingSchema.php";
require_once __DIR__."/Repositories/SettingRepository.php";

class SystemController {
    private function json(){ return json_decode(file_get_contents("php://input"), true) ?: []; }

    private function requireAdmin() {
        $u = AuthController::requireAuth();
        if ($u['role'] !== 'admin' && $u['role'] !== 'superadmin') {
            Response::json(["error"=>"forbidden", "details"=>"No autorizado"], 403);
            exit;
        }
        return $u;
    }

    public function getStats(){
        $this->requireAdmin();
        $pdo = Database::pdo();
        
        $stats = [
            "users_total" => 0,
            "users_active" => 0,
            "users_suspended" => 0,
            "users_admin" => 0,
            "publications" => 0,
            "publications_pending" => 0,
            "publications_documents" => 0,
            "publications_convocations" => 0,
            "publications_recent_30d" => 0,
            "editions" => 0,
            "editions_published" => 0,
            "revenue_total_usd" => 0,
            "revenue_pending_usd" => 0,
            "transactions_completed" => 0
        ];


        try {
            // User Statistics
            try { $stats["users_total"] = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn(); } catch(Throwable $e){}
            try { $stats["users_active"] = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE status='active' OR status IS NULL")->fetchColumn(); } catch(Throwable $e){}
            try { $stats["users_suspended"] = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE status='suspended'")->fetchColumn(); } catch(Throwable $e){}
            try { $stats["users_admin"] = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='admin'")->fetchColumn(); } catch(Throwable $e){}
            
            // Publication Statistics
            try { $stats["publications"] = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE status='Publicada'")->fetchColumn(); } catch(Throwable $e){}
            try { $stats["publications_pending"] = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE status IN ('Por verificar', 'En trámite')")->fetchColumn(); } catch(Throwable $e){}
            
            // Publications by type
            try { $stats["publications_documents"] = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE pub_type='Documento' AND status='Publicada'")->fetchColumn(); } catch(Throwable $e){}
            try { $stats["publications_convocations"] = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE pub_type='Convocatoria' AND status='Publicada'")->fetchColumn(); } catch(Throwable $e){}
            
            // Edition Statistics
            try { $stats["editions"] = (int)$pdo->query("SELECT COUNT(*) FROM editions")->fetchColumn(); } catch(Throwable $e){}
            try { $stats["editions_published"] = (int)$pdo->query("SELECT COUNT(*) FROM editions WHERE status='Publicada'")->fetchColumn(); } catch(Throwable $e){}
            
            // Financial Statistics
            try { 
                $stats["revenue_total_usd"] = (float)$pdo->query("SELECT COALESCE(SUM(COALESCE(subtotal_usd,0) + COALESCE(iva_usd,0)), 0) FROM legal_requests WHERE status IN ('En trámite', 'Publicada')")->fetchColumn();
                $stats["revenue_pending_usd"] = (float)$pdo->query("SELECT COALESCE(SUM(COALESCE(subtotal_usd,0) + COALESCE(iva_usd,0)), 0) FROM legal_requests WHERE status IN ('Borrador', 'Por verificar')")->fetchColumn();
            } catch(Throwable $e){
                error_log("Financial stats error: " . $e->getMessage());
            }
            
            // Completed transactions
            try { $stats["transactions_completed"] = (int)$pdo->query("SELECT COUNT(*) FROM legal_payments WHERE status='Aprobado'")->fetchColumn(); } catch(Throwable $e){}
            
            // Recent activity
            try { $stats["publications_recent_30d"] = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn(); } catch(Throwable $e){}

        } catch (Throwable $e) {
            error_log("Fatal error fetching stats: " . $e->getMessage());
        }
        
        Response::json($stats);
    }
    
    public function clearStats() {
        $this->requireAdmin();
        // Since stats are calculated on the fly, clearing them might just mean resetting something if cached.
        // For now, return ok to satisfy the frontend contract.
        Response::json(['ok'=>true]);
    }

    // --- SETTINGS (BCV, Prices) ---
    public function getSettings(){
        $this->requireAdmin();
        $pdo = Database::pdo();
        $settings = (new SettingRepository($pdo))->getMany(SettingSchema::keys());
        Response::json(["settings"=>$settings]);
    }
    
    public function getPublicSettings(){
        $pdo = Database::pdo();
        $stmt = $pdo->query("SELECT `key`, value FROM settings WHERE `key` IN ('bcv_rate', 'price_per_folio_usd', 'convocatoria_usd', 'iva_percent', 'unit_tax_bs', 'instructions_documents_text', 'instructions_documents_image_url', 'instructions_convocatorias_text', 'banner_main_1', 'banner_sidebar', 'promo_popup')");
        $settings = [];
        while($row = $stmt->fetch(PDO::FETCH_ASSOC)) $settings[$row["key"]] = $row["value"];
        Response::json(["settings"=>$settings]);
    }
    
    public function saveSettings(){
        $user = $this->requireAdmin();
        $in = json_decode(file_get_contents('php://input'), true);
        if (!is_array($in) || $in === []) {
            throw new HttpException(400, 'invalid_settings_payload', 'No se recibieron opciones para guardar.');
        }
        $pdo = Database::pdo();
        $now = gmdate('Y-m-d H:i:s');
        $validated = [];
        $bannerFileIds = [];

        foreach ($in as $k => $v) {
            $validatedValue = SettingSchema::validate((string) $k, $v);
            $validated[(string) $k] = (string) $validatedValue;
            $bannerFileId = null;
            if (in_array((string)$k, ['banner_main_1', 'banner_sidebar', 'promo_popup'], true) && $validatedValue !== '') {
                if (!preg_match('~/api/uploads/(\d+)(?:$|[/?#])~', (string)$validatedValue, $m)) {
                    throw new HttpException(422, 'invalid_banner_file', 'La URL del banner no corresponde a un archivo cargado.');
                }
                $bannerFileId = (int)$m[1];
                $fileStmt = $pdo->prepare('SELECT name, type FROM files WHERE id=? AND deleted_at IS NULL');
                $fileStmt->execute([$bannerFileId]);
                $file = $fileStmt->fetch(PDO::FETCH_ASSOC);
                $extension = strtolower(pathinfo((string)($file['name'] ?? ''), PATHINFO_EXTENSION));
                if (!$file || !in_array($extension, ['jpg','jpeg','png','webp','gif'], true)) {
                    throw new HttpException(422, 'invalid_banner_file', 'El archivo seleccionado no es una imagen válida.');
                }
            }
            if ($bannerFileId !== null) {
                $bannerFileIds[] = $bannerFileId;
            }
        }

        $ownsTransaction = !$pdo->inTransaction();
        if ($ownsTransaction) $pdo->beginTransaction();
        try {
            $repository = new SettingRepository($pdo);
            foreach ($validated as $key => $value) {
                $repository->set($key, $value, $now);
            }
            if ($bannerFileIds !== []) {
                $publicStmt = $pdo->prepare('UPDATE files SET is_public=1, updated_at=? WHERE id=?');
                foreach (array_unique($bannerFileIds) as $bannerFileId) {
                    $publicStmt->execute([$now, $bannerFileId]);
                }
            }
            $pdo->prepare(
                'INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?)'
            )->execute([(int) $user['id'], 'update_settings', 'settings', null]);
            if ($ownsTransaction) $pdo->commit();
        } catch (Throwable $e) {
            if ($ownsTransaction && $pdo->inTransaction()) $pdo->rollBack();
            error_log('[settings.save] ' . get_class($e) . ': ' . $e->getMessage());
            throw $e;
        }

        Response::json(["ok"=>true, 'updated_keys'=>array_keys($validated)]);
    }

    public function getBcvRate(){
        $pdo = Database::pdo();
        $rate = $pdo->query("SELECT value FROM settings WHERE `key`='bcv_rate'")->fetchColumn();
        Response::json(["rate"=>(float)$rate, "date_iso"=>gmdate("c")]);
    }

    // --- EDITIONS ---
    public function listEditions(){
        $pdo = Database::pdo();
        $stmt = $pdo->query("SELECT * FROM editions ORDER BY date DESC LIMIT 50");
        Response::json(["items"=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // --- DIRECTORY ---
    public function getDirectoryProfile(){
        $u = AuthController::requireAuth();
        $pdo = Database::pdo();
        $stmt = $pdo->prepare("SELECT * FROM directory_profiles WHERE user_id=?");
        $stmt->execute([$u["id"]]);
        $p = $stmt->fetch(PDO::FETCH_ASSOC);
        Response::json(["profile"=>$p ?: null]);
    }
    
    // --- PAYMENTS ---
    public function listPayments(){
        $pdo = Database::pdo();
        $stmt = $pdo->query("SELECT * FROM payment_methods ORDER BY id DESC");
        $items = array_map(static function (array $item): array {
            $item['qr_url'] = (int)($item['qr_file_id'] ?? 0) > 0
                ? '/api/payment-methods/' . (int)$item['id'] . '/qr'
                : null;
            return $item;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
        Response::json(["items"=>$items]);
    }

    // --- PAGES (CMS) ---
    public function listPagesPublic(){
        $pdo = Database::pdo();
        $stmt = $pdo->query("SELECT slug, title, content FROM pages WHERE published=1");
        Response::json(["items"=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // --- ADMIN PAGES (Publications) ---
    public function listPages(){
        $this->requireAdmin();
        $pdo = Database::pdo();
        $stmt = $pdo->query("SELECT * FROM pages ORDER BY created_at DESC");
        Response::json(["items"=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    public function getPage($id){
        $this->requireAdmin();
        $pdo = Database::pdo();
        $stmt = $pdo->prepare("SELECT * FROM pages WHERE id=?");
        $stmt->execute([$id]);
        $page = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$page) Response::json(['error'=>'not_found'], 404);
        
        // Mapear published a status para compatibilidad con frontend
        $page['status'] = $page['published'] ? 'published' : 'draft';
        Response::json(['item'=>$page]);
    }

    public function createPage(){
        $this->requireAdmin();
        $in = $this->json();
        $pdo = Database::pdo();
        
        $title = trim($in['title'] ?? '');
        $content = $in['content'] ?? '';
        $published = ($in['status'] ?? 'published') === 'published' ? 1 : 0;
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $title)));

        if ($title === '') Response::json(['error'=>'Title required'], 400);

        $stmt = $pdo->prepare("INSERT INTO pages(title, slug, content, published, created_at, updated_at) VALUES(?,?,?,?,NOW(),NOW())");
        try {
            $stmt->execute([$title, $slug, $content, $published]);
            Response::json(['id'=>(int)$pdo->lastInsertId(), 'slug'=>$slug]);
        } catch(PDOException $e) {
            if ($e->getCode() == 23000) { // Duplicate slug
                $slug .= '-' . uniqid();
                $stmt->execute([$title, $slug, $content, $published]);
                Response::json(['id'=>(int)$pdo->lastInsertId(), 'slug'=>$slug]);
            } else {
                throw $e;
            }
        }
    }

    public function updatePage($id){
        $this->requireAdmin();
        $in = $this->json();
        $pdo = Database::pdo();

        $title = trim($in['title'] ?? '');
        $content = $in['content'] ?? '';
        $published = ($in['status'] ?? 'published') === 'published' ? 1 : 0;
        
        $sql = "UPDATE pages SET content=?, published=?, updated_at=NOW()";
        $params = [$content, $published];

        if ($title !== '') {
            $sql .= ", title=?";
            $params[] = $title;
        }

        $sql .= " WHERE id=?";
        $params[] = $id;

        $pdo->prepare($sql)->execute($params);
        Response::json(['ok'=>true]);
    }

    public function deletePage($id){
        $this->requireAdmin();
        $pdo = Database::pdo();
        $pdo->prepare("DELETE FROM pages WHERE id=?")->execute([$id]);
        Response::json(['ok'=>true]);
    }

    public function getActivityLog(){
        $u = AuthController::requireAuth();
        if ($u['role'] !== 'superadmin') {
            Response::json(["error"=>"forbidden", "message"=>"Acceso denegado."], 403);
            exit;
        }

        $pdo = Database::pdo();
        $stmt = $pdo->query("
            SELECT a.id, a.actor_user_id, a.action, a.resource_type, a.resource_id, a.ip_address, a.created_at, u.name as actor_name, u.role as actor_role
            FROM audit_logs a
            LEFT JOIN users u ON a.actor_user_id = u.id
            ORDER BY a.created_at DESC
            LIMIT 50
        ");
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json(['items' => $logs]);
    }

}
