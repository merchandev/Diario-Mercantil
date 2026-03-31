<?php
require_once __DIR__.'/../src/fpdf.php';
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
$pdf->SectionHeader('DETALLES DEL CLIENTE');
$pdf->KeyValue('Cliente:', 'Cliente de Prueba', 10);
$pdf->KeyValue('Documento ID:', 'V-12345678', 10);
$pdf->Ln(5);

// -- DETALLES DE LA ORDEN --
$pdf->SectionHeader('DETALLES DE LA ORDEN');
$pdf->KeyValue('Estado:', 'Pendiente', 10);
$pdf->KeyValue('Folios:', '5', 10);

$pdf->Output('F', __DIR__.'/test_output.pdf');

echo "PDF created at " . __DIR__.'/test_output.pdf' . "\n";
echo "Size: " . filesize(__DIR__.'/test_output.pdf') . " bytes\n";
