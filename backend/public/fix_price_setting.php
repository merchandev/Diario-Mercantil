<?php
require_once __DIR__ . '/../src/Database.php';

try {
    $db = Database::getInstance();
    
    echo "📋 Current settings:\n";
    $stmt = $db->query("SELECT `key`, value FROM settings");
    $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    print_r($settings);
    
    echo "\n\n";
    
    // Check if price_per_folio_usd exists
    if (!isset($settings['price_per_folio_usd'])) {
        echo "⚠️ price_per_folio_usd NOT FOUND\n";
        echo "💡 Creating with default value 2.50 USD\n\n";
        
        $now = gmdate('Y-m-d H:i:s');
        $stmt = $db->prepare("INSERT INTO settings (`key`, value, updated_at) VALUES (?, ?, ?)");
        $stmt->execute(['price_per_folio_usd', '2.50', $now]);
        
        echo "✅ price_per_folio_usd created successfully!\n\n";
        
        // Verify
        $stmt = $db->query("SELECT `key`, value FROM settings WHERE `key` = 'price_per_folio_usd'");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "Verification: ";
        print_r($result);
    } else {
        echo "✅ price_per_folio_usd EXISTS: " . $settings['price_per_folio_usd'] . " USD\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
