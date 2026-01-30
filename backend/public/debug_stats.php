<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__.'/../src/Database.php';

try {
    $pdo = Database::pdo();
    echo "Connected to database.\n";
    
    $stats = [];
    
    // User Statistics
    echo "Querying users_total...\n";
    $stats["users_total"] = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    
    echo "Querying users_active...\n";
    $stats["users_active"] = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE status='active' OR status IS NULL")->fetchColumn();
    
    echo "Querying users_suspended...\n";
    $stats["users_suspended"] = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE status='suspended'")->fetchColumn();
    
    echo "Querying users_admin...\n";
    $stats["users_admin"] = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='admin'")->fetchColumn();
    
    // Publication Statistics
    echo "Querying publications...\n";
    $stats["publications"] = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE status='Publicada'")->fetchColumn();
    
    echo "Querying publications_pending...\n";
    $stats["publications_pending"] = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE status IN ('Pendiente', 'Procesando', 'Por verificar')")->fetchColumn();
    
    // Publications by type
    echo "Querying publications_documents...\n";
    $stats["publications_documents"] = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE pub_type='Documento' AND status='Publicada'")->fetchColumn();
    
    echo "Querying publications_convocations...\n";
    $stats["publications_convocations"] = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE pub_type='Convocatoria' AND status='Publicada'")->fetchColumn();
    
    // Edition Statistics
    echo "Querying editions...\n";
    $stats["editions"] = (int)$pdo->query("SELECT COUNT(*) FROM editions")->fetchColumn();
    
    // Financial Statistics
    echo "Querying revenue_total_usd...\n";
    $stats["revenue_total_usd"] = (float)$pdo->query("SELECT COALESCE(SUM(amount), 0) FROM payments")->fetchColumn();
    
    echo "Querying transactions_completed...\n";
    $stats["transactions_completed"] = (int)$pdo->query("SELECT COUNT(*) FROM payments")->fetchColumn();
    
    echo "Querying publications_recent_30d...\n";
    $stats["publications_recent_30d"] = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();

    echo "\nStats retrieved successfully:\n";
    print_r($stats);

} catch (PDOException $e) {
    echo "\nPDO Error: " . $e->getMessage() . "\n";
} catch (Throwable $e) {
    echo "\nError: " . $e->getMessage() . "\n";
}
