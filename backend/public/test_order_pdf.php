<?php
require_once __DIR__.'/../src/OrderPdf.php';

$pdf = new OrderPdf();
$pdf->AliasNbPages();
$pdf->orderInfo = [
    'order_no' => 'TEST-001',
    'date' => date('Y-m-d'),
    'name' => 'Cliente de Prueba',
    'document' => 'V-12345678',
    'email' => 'test@example.com',
    'phone' => '0414-1234567',
    'status' => 'Pendiente',
    'pub_type' => 'Documento',
    'folios' => 5
];
$pdf->AddPage();

// -- DETALLES DEL CLIENTE --
$pdf->SectionTitle('DETALLES DEL CLIENTE');
$pdf->KeyValueRow('Cliente:', 'Cliente de Prueba');
$pdf->KeyValueRow('Documento ID:', 'V-12345678');
$pdf->Ln(5);

// -- DETALLES DE LA ORDEN --
$pdf->SectionTitle('DETALLES DE LA ORDEN');
$pdf->KeyValueRow('Estado:', 'Pendiente');
$pdf->KeyValueRow('Folios:', 5);

$pdf->Output('F', __DIR__.'/test_output.pdf');

echo "PDF created at " . __DIR__.'/test_output.pdf' . "\n";
echo "Size: " . filesize(__DIR__.'/test_output.pdf') . " bytes\n";
