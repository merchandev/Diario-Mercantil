<?php
require_once __DIR__."/Response.php";
require_once __DIR__."/Database.php";
require_once __DIR__."/AuthController.php";

class SystemController {
    private function json(){ return json_decode(file_get_contents("php://input"), true) ?: []; }

    public function getStats(){
        // AuthController::requireAuth(); // Optional for dashboard stats
        $pdo = Database::pdo();
        
        // User Statistics
        $total_users = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $active_users = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE status='active' OR status IS NULL")->fetchColumn();
        $suspended_users = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE status='suspended'")->fetchColumn();
        $admin_users = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='admin'")->fetchColumn();
        
        // Publication Statistics
        $total_publications = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE status='Publicada'")->fetchColumn();
        $pending_publications = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE status IN ('Pendiente', 'Procesando', 'Por verificar')")->fetchColumn();
        
        // Publications by type
        $documents = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE publication_type='documento' AND status='Publicada'")->fetchColumn();
        $convocations = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE publication_type='convocatoria' AND status='Publicada'")->fetchColumn();
        
        // Edition Statistics
        $total_editions = (int)$pdo->query("SELECT COUNT(*) FROM editions")->fetchColumn();
        
        // Payment/Financial Statistics
        // Total revenue (suma de todos los pagos procesados)
        $total_revenue = (float)$pdo->query("SELECT COALESCE(SUM(total_usd), 0) FROM legal_requests WHERE status='Publicada' AND total_usd IS NOT NULL")->fetchColumn();
        
        // Pending revenue (publicaciones en proceso de pago)
        $pending_revenue = (float)$pdo->query("SELECT COALESCE(SUM(total_usd), 0) FROM legal_requests WHERE status IN ('Pendiente', 'Por verificar') AND total_usd IS NOT NULL")->fetchColumn();
        
        // Completed transactions count
        $completed_transactions = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE status='Publicada' AND total_usd IS NOT NULL AND total_usd > 0")->fetchColumn();
        
        // Recent activity (últimas 30 días)
        $recent_publications = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();
        
        Response::json([
            // User stats
            "users_total" => $total_users,
            "users_active" => $active_users,
            "users_suspended" => $suspended_users,
            "users_admin" => $admin_users,
            
            // Publication stats
            "publications" => $total_publications,
            "publications_pending" => $pending_publications,
            "publications_documents" => $documents,
            "publications_convocations" => $convocations,
            "publications_recent_30d" => $recent_publications,
            
            // Edition stats
            "editions" => $total_editions,
            
            // Financial stats
            "revenue_total_usd" => round($total_revenue, 2),
            "revenue_pending_usd" => round($pending_revenue, 2),
            "transactions_completed" => $completed_transactions
        ]);
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
        AuthController::requireAuth();
        $in = $this->json();
        $pdo = Database::pdo();
        foreach($in as $k=>$v){
            $pdo->prepare("INSERT INTO settings(`key`, `value`) VALUES(?,?) ON DUPLICATE KEY UPDATE `value`=?")
                ->execute([$k, $v, $v]);
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
        $stmt = $pdo->query("SELECT slug, title FROM pages WHERE status='published'");
        Response::json(["items"=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // --- EMERGENCY FIX (Web Access) ---
    public function emergencyFix(){
        try {
            $pdo = Database::pdo();
            $log = [];
            
            // 1. Repair Users
            $cols = $pdo->query("DESCRIBE users")->fetchAll(PDO::FETCH_COLUMN);
            $missingUsers = [];
            if (!in_array('phone', $cols)) $missingUsers['phone'] = "VARCHAR(20) NULL";
            if (!in_array('email', $cols)) $missingUsers['email'] = "VARCHAR(100) NULL";
            if (!in_array('person_type', $cols)) $missingUsers['person_type'] = "VARCHAR(20) DEFAULT 'natural'";
            if (!in_array('created_at', $cols)) $missingUsers['created_at'] = "DATETIME NULL";
            if (!in_array('updated_at', $cols)) $missingUsers['updated_at'] = "DATETIME NULL";

            foreach ($missingUsers as $col => $def) {
                $pdo->exec("ALTER TABLE users ADD COLUMN $col $def");
                $log[] = "Columna usuario agregada: $col";
            }

            // 2. Repair Tokens
            $colsT = $pdo->query("DESCRIBE auth_tokens")->fetchAll(PDO::FETCH_COLUMN);
            if (!in_array('created_at', $colsT)) {
                $pdo->exec("ALTER TABLE auth_tokens ADD COLUMN created_at DATETIME NULL");
                $log[] = "Columna token agregada: created_at";
            }

            // 3. Reset Admin
            $pdo->exec("DELETE FROM users WHERE document IN ('merchandev', 'Vmerchandev')");
            $pass = 'G0ku*1896';
            $hash = password_hash($pass, PASSWORD_DEFAULT);
            $now = gmdate("Y-m-d H:i:s");
            
            $stmt = $pdo->prepare("INSERT INTO users (document, name, password_hash, role, phone, email, person_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute(['merchandev', 'Super Admin', $hash, 'admin', '000000', 'admin@sys.com', 'juridica', $now, $now]);
            $log[] = "Usuario merchandev reiniciado correntamente.";

            Response::json(["status"=>"FIX_APPLIED", "log"=>$log]);

        } catch (Throwable $e) {
            Response::json(["error"=>$e->getMessage()], 500);
        }
    }
}
