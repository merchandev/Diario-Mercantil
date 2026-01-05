<?php
// Add sample legal_requests for solicitante user (user_id=2)
require_once __DIR__.'/../src/Database.php';

try {
  $pdo = Database::pdo();
  
  // Check if solicitante user exists
  $solicitanteId = (int)$pdo->query("SELECT id FROM users WHERE document='J000111222' LIMIT 1")->fetchColumn();
  if (!$solicitanteId) {
    echo "Solicitante user not found (document=J000111222), skipping\n";
    exit(0);
  }
  
  // Check if already has data
  $existing = (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE user_id=$solicitanteId")->fetchColumn();
  if ($existing > 0) {
    echo "Solicitante already has $existing legal_requests, skipping\n";
    exit(0);
  }
  
  $now = gmdate('c');
  $today = gmdate('Y-m-d');
  $yesterday = gmdate('Y-m-d', strtotime('-1 day'));
  $lastWeek = gmdate('Y-m-d', strtotime('-7 days'));
  
  $samples = [
    ['Por verificar', 'Mi Empresa XYZ C.A.', 'J301234567', $today, null, null, '0414-1234567', 'contacto@miempresa.com', 'Caracas, Venezuela', 4, null, $solicitanteId, 'Documento', '{"oficina":"Registro Mercantil Primero","tomo":"15","numero":"234","anio":"2024","expediente":"EXP-001"}', $now],
    ['Borrador', 'Comercio ABC S.R.L.', 'J309876543', $today, null, null, '0412-9876543', 'info@comercioabc.com', 'Valencia, Carabobo', 2, 'Falta adjuntar documento notariado', $solicitanteId, 'Documento', '{"oficina":"Registro Mercantil Segundo","tomo":"22","numero":"567","anio":"2023","expediente":"EXP-002"}', $now],
    ['En trámite', 'Inversiones DEF C.A.', 'J305556789', $yesterday, 'ORD-2025-100', null, '0424-5556789', 'ventas@inversionesdef.com', 'Maracaibo, Zulia', 3, null, $solicitanteId, 'Documento', '{"oficina":"Registro Mercantil Tercero","tomo":"8","numero":"891","anio":"2024","expediente":"EXP-003"}', $now],
    ['Publicada', 'Asociación Civil GHI', 'J302223456', $lastWeek, 'ORD-2025-099', $lastWeek, '0416-2223456', 'admin@asociacionghi.org', 'Barquisimeto, Lara', 1, null, $solicitanteId, 'Convocatoria', '{"tipo_convocatoria":"Asamblea Ordinaria de accionistas o socios","oficina":"Registro Civil","tomo":"5","numero":"123","anio":"2020","expediente":"AC-001"}', $now],
    ['Por verificar', 'Servicios Tech JKL C.A.', 'J307778901', $today, null, null, '0414-7778901', 'soporte@techjkl.com', 'Mérida, Mérida', 6, null, $solicitanteId, 'Documento', '{"oficina":"Registro Mercantil Cuarto","tomo":"12","numero":"345","anio":"2025","expediente":"EXP-004"}', $now],
    ['Publicada', 'Constructora MNO C.A.', 'J304445678', $lastWeek, 'ORD-2025-098', $lastWeek, '0412-4445678', 'proyectos@construmno.com', 'Puerto La Cruz, Anzoátegui', 8, null, $solicitanteId, 'Documento', '{"oficina":"Registro Mercantil Primero","tomo":"28","numero":"678","anio":"2022","expediente":"EXP-005"}', $now],
    ['Borrador', 'Distribuidora PQR S.R.L.', 'J301112233', $today, null, null, '0424-1112233', 'ventas@distripqr.com', null, 5, 'Pendiente confirmación de pago', $solicitanteId, 'Documento', null, $now],
  ];
  
  $stmt = $pdo->prepare('INSERT INTO legal_requests(status,name,document,date,order_no,publish_date,phone,email,address,folios,comment,user_id,pub_type,meta,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  foreach ($samples as $s) {
    $stmt->execute($s);
  }
  
  echo "Seeded ".count($samples)." legal_requests for solicitante (user_id=$solicitanteId)\n";
  
} catch (Throwable $e) {
  fwrite(STDERR, 'Error seeding solicitante data: '.$e->getMessage()."\n");
  exit(1);
}
?>
