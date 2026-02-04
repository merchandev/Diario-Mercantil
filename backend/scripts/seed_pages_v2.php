<?php
require __DIR__ . '/../src/Database.php';

try {
    $pdo = Database::pdo();
    echo "🔌 Conectado a la base de datos.\n";

    $pages = [
        [
            'slug' => 'sobre-el-diario',
            'title' => 'Sobre el Diario Mercantil',
            'status' => 'published',
            'body_blocks' => json_encode([
                [
                    'id' => 'b1',
                    'type' => 'heading',
                    'props' => ['text' => '¿Quiénes somos?', 'level' => 2, 'align' => 'left']
                ],
                [
                    'id' => 'b2',
                    'type' => 'paragraph',
                    'props' => ['text' => 'El Diario Mercantil es la plataforma líder en Venezuela para la publicación de avisos legales, convocatorias y documentos oficiales. Nuestro compromiso es garantizar la transparencia y el cumplimiento legal de todas las publicaciones.', 'align' => 'left']
                ]
            ])
        ],
        [
            'slug' => 'como-publicar',
            'title' => 'Cómo Publicar',
            'status' => 'published',
            'body_blocks' => json_encode([
                [
                    'id' => 'b1',
                    'type' => 'heading',
                    'props' => ['text' => 'Guía para publicar avisos', 'level' => 2, 'align' => 'left']
                ],
                [
                    'id' => 'b2',
                    'type' => 'paragraph',
                    'props' => ['text' => '1. Regístrese o inicie sesión en nuestra plataforma.', 'align' => 'left']
                ],
                [
                    'id' => 'b3',
                    'type' => 'paragraph',
                    'props' => ['text' => '2. Seleccione el tipo de documento (Actas, Balances, Convocatorias).', 'align' => 'left']
                ],
                [
                    'id' => 'b4',
                    'type' => 'paragraph',
                    'props' => ['text' => '3. Suba su archivo PDF o utilice nuestro editor en línea.', 'align' => 'left']
                ],
                [
                    'id' => 'b5',
                    'type' => 'paragraph',
                    'props' => ['text' => '4. Realice el pago correspondiente y espere la aprobación.', 'align' => 'left']
                ]
            ])
        ],
        [
            'slug' => 'directorio-legal',
            'title' => 'Directorio Legal',
            'status' => 'published',
            'body_blocks' => json_encode([
                [
                    'id' => 'b1',
                    'type' => 'heading',
                    'props' => ['text' => 'Directorio de Abogados', 'level' => 2, 'align' => 'left']
                ],
                [
                    'id' => 'b2',
                    'type' => 'paragraph',
                    'props' => ['text' => 'Encuentre a los mejores profesionales del derecho en nuestro directorio certificado.', 'align' => 'left']
                ]
            ])
        ],
        [
            'slug' => 'preguntas-frecuentes',
            'title' => 'Preguntas Frecuentes',
            'status' => 'published',
            'body_blocks' => json_encode([
                [
                    'id' => 'b1',
                    'type' => 'heading',
                    'props' => ['text' => 'Preguntas Frecuentes', 'level' => 2, 'align' => 'left']
                ],
                [
                    'id' => 'b2',
                    'type' => 'paragraph',
                    'props' => ['text' => 'Aquí encontrará respuestas a las dudas más comunes sobre el proceso de publicación.', 'align' => 'left']
                ]
            ])
        ]
    ];

    $stmt = $pdo->prepare("INSERT INTO pages (slug, title, status, body_json, header_html, footer_html, created_at, updated_at) VALUES (:slug, :title, :status, :body_json, '', '', NOW(), NOW()) ON DUPLICATE KEY UPDATE title = VALUES(title), body_json = VALUES(body_json), status = VALUES(status)");

    foreach ($pages as $page) {
        $stmt->execute([
            ':slug' => $page['slug'],
            ':title' => $page['title'],
            ':status' => $page['status'],
            ':body_json' => $page['body_blocks'] // The array key in $pages is still body_blocks but maps to body_json column
        ]);
        echo "✅ Página procesada: {$page['title']} ({$page['slug']})\n";
    }

    echo "🚀 Todas las páginas han sido creadas o actualizadas.\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
