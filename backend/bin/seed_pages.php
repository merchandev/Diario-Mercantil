<?php
require __DIR__ . '/../src/Database.php';

try {
    $pdo = Database::pdo();
    
    // 1. Seed SEO Metadata for public pages
    $public_routes = [
        ['path' => '/', 'title' => 'Inicio - Diario Mercantil', 'desc' => 'El mejor diario mercantil de Venezuela'],
        ['path' => '/ediciones', 'title' => 'Ediciones - Diario Mercantil', 'desc' => 'Explora nuestras ediciones impresas en formato digital'],
        ['path' => '/publicaciones', 'title' => 'Publicaciones - Diario Mercantil', 'desc' => 'Últimas publicaciones y avisos legales'],
        ['path' => '/contacto', 'title' => 'Contacto - Diario Mercantil', 'desc' => 'Comunícate con nosotros'],
        ['path' => '/medios-pago', 'title' => 'Medios de Pago - Diario Mercantil', 'desc' => 'Opciones de pago para tus publicaciones'],
        ['path' => '/directorio-legal', 'title' => 'Directorio Legal - Diario Mercantil', 'desc' => 'Encuentra profesionales del derecho'],
    ];

    $seoStmt = $pdo->prepare("INSERT IGNORE INTO seo_metadata (path, title, description, robots) VALUES (?, ?, ?, 'index, follow')");
    
    foreach ($public_routes as $route) {
        $seoStmt->execute([$route['path'], $route['title'], $route['desc']]);
    }

    echo "✅ Metadatos SEO por defecto añadidos.\n";

    // 2. Seed CMS Pages (Terminos, Privacidad, Quienes Somos)
    $cms_pages = [
        ['slug' => 'quienes-somos', 'title' => 'Quiénes Somos', 'content' => 'Somos el Diario Mercantil de Venezuela...'],
        ['slug' => 'terminos-y-condiciones', 'title' => 'Términos y Condiciones', 'content' => 'Términos de uso de nuestro servicio...'],
        ['slug' => 'politica-de-privacidad', 'title' => 'Política de Privacidad', 'content' => 'Cómo manejamos tus datos...']
    ];

    $pageStmt = $pdo->prepare("INSERT IGNORE INTO pages (slug, title, body_blocks) VALUES (?, ?, ?)");
    
    foreach ($cms_pages as $page) {
        // Create a simple paragraph block
        $blocks = json_encode([[
            'id' => uniqid(),
            'type' => 'paragraph',
            'props' => [
                'text' => $page['content'],
                'align' => 'left'
            ]
        ]]);
        $pageStmt->execute([$page['slug'], $page['title'], $blocks]);
    }

    echo "✅ Páginas CMS por defecto añadidas.\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
