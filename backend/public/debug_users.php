<?php
require_once __DIR__ . '/../src/Database.php';

header('Content-Type: application/json');

try {
    $db = Database::getInstance();
    
    // Get all users
    $stmt = $db->prepare("SELECT id, document, name, role, created_at FROM users ORDER BY id");
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get recent tokens
    $stmt = $db->prepare("
        SELECT 
            at.id,
            at.user_id,
            u.document,
            u.name,
            u.role,
            LEFT(at.token, 20) as token_preview,
            at.created_at
        FROM auth_tokens at
        LEFT JOIN users u ON at.user_id = u.id
        ORDER BY at.created_at DESC
        LIMIT 10
    ");
    $stmt->execute();
    $tokens = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'users' => $users,
        'recent_tokens' => $tokens
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
