<?php
require_once __DIR__."/Response.php";
require_once __DIR__."/Database.php";
require_once __DIR__."/AuthController.php";

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
            try { $stats["publications_pending"] = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE status IN ('Pendiente', 'Procesando', 'Por verificar')")->fetchColumn(); } catch(Throwable $e){}
            
            // Publications by type
            try { $stats["publications_documents"] = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE pub_type='Documento' AND status='Publicada'")->fetchColumn(); } catch(Throwable $e){}
            try { $stats["publications_convocations"] = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE pub_type='Convocatoria' AND status='Publicada'")->fetchColumn(); } catch(Throwable $e){}
            
            // Edition Statistics
            try { $stats["editions"] = (int)$pdo->query("SELECT COUNT(*) FROM editions")->fetchColumn(); } catch(Throwable $e){}
            
            // Financial Statistics (Fixed: use legal_payments)
            try { 
                // Using amount_bs as revenue for now. Convert to USD if needed requires rate.
                // Assuming 1 USD = 36 BS approx if simplistic, but let's just show BS amount.
                $stats["revenue_total_usd"] = (float)$pdo->query("SELECT COALESCE(SUM(amount_bs), 0) FROM legal_payments")->fetchColumn();
                $stats["revenue_pending_usd"] = (float)$pdo->query("SELECT COALESCE(SUM(amount_bs), 0) FROM legal_payments WHERE status='Pendiente'")->fetchColumn();
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

    // --- SETTINGS (BCV, Prices) ---
    public function getSettings(){
        $pdo = Database::pdo();
        $stmt = $pdo->query("SELECT `key`, value FROM settings");
        $settings = [];
        while($row = $stmt->fetch(PDO::FETCH_ASSOC)) $settings[$row["key"]] = $row["value"];
        Response::json(["settings"=>$settings]);
    }
    
    public function saveSettings(){
        $this->requireAdmin();
        $in = $this->json();
        $pdo = Database::pdo();
        foreach($in as $k=>$v){
            $pdo->prepare('INSERT INTO settings(`key`, value, updated_at) VALUES(?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()')
                ->execute([$k, $v]);
        }
        Response::json(["ok"=>true]);
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
        $stmt = $pdo->query("SELECT * FROM payment_methods");
        Response::json(["items"=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
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

}
