<?php
require_once __DIR__."/Response.php";
require_once __DIR__."/Database.php";
require_once __DIR__."/AuthController.php";

class SystemController {
    private function json(){ return json_decode(file_get_contents("php://input"), true) ?: []; }

    // --- STATS ---
    public function getStats(){
        // AuthController::requireAuth(); // Optional for dashboard stats
        $pdo = Database::pdo();
        $pubs = $pdo->query("SELECT COUNT(*) FROM legal_requests WHERE status='Publicada'")->fetchColumn();
        $edits = $pdo->query("SELECT COUNT(*) FROM editions")->fetchColumn();
        $users = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        Response::json(["publications"=>$pubs, "editions"=>$edits, "users_active"=>$users]);
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
}
