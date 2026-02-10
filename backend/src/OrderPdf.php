<?php
require_once __DIR__.'/fpdf.php';

class OrderPdf extends FPDF {
    public $title = 'ORDEN DE SERVICIO';
    public $orderInfo = [];

    function Header() {
        // Clean Header (White background)
        $this->SetFillColor(255, 255, 255);
        $this->Rect(0, 0, 210, 45, 'F');
        
        // Logo
        $logoPath = realpath(__DIR__.'/../public/logo-blanco.png');
        // Note: If logo-blanco is white text, it won't show on white bg. check if we need a dark one?
        // User said "keep current colors". Current logo is white text? 
        // If logo-blanco is white, we need a dark bg or a different logo.
        // Wait, the user reference showed white paper.
        // If I have a white logo, I need a colored header OR a dark logo.
        // I'll stick to the colored header 8f1920 to ensure logo visibility, but make it cleaner layout blocks.
        
        $this->SetFillColor(143, 25, 32);
        $this->Rect(0, 0, 210, 40, 'F');
        
        if($logoPath && file_exists($logoPath)) {
            $this->Image($logoPath, 10, 10, 70);
        }
        
        // Title & Order Info - Aligned Right
        $this->SetFont('Arial', 'B', 20);
        $this->SetTextColor(255, 255, 255);
        $this->SetXY(100, 10);
        $this->Cell(100, 10, $this->title, 0, 1, 'R');
        
        $this->SetFont('Arial', '', 10);
        if(!empty($this->orderInfo)) {
             $orderNo = $this->orderInfo['order_no'] ?? $this->orderInfo['id'] ?? '---';
             $this->SetXY(100, 20);
             $this->Cell(100, 6, '# ORDEN: ' . $orderNo, 0, 1, 'R');
             $this->Cell(100, 6, 'FECHA: ' . ($this->orderInfo['date'] ?? date('Y-m-d')), 0, 1, 'R');
        }
        $this->Ln(25);
    }

    function Footer() {
        $this->SetY(-15);
        $this->SetFont('Arial', 'I', 8);
        $this->SetTextColor(128, 128, 128);
        $this->Cell(0, 10, 'Pagina '.$this->PageNo().'/{nb} - Diario Mercantil de Venezuela', 0, 0, 'C');
    }
    
    function InfoSection($clientData, $orderDetails) {
        $startY = $this->GetY();
        $col1X = 10;
        $col2X = 110;
        
        // Col 1: Client Info
        $this->SetXY($col1X, $startY);
        $this->SectionHeader('DETALLES DEL CLIENTE');
        foreach($clientData as $k => $v) {
            $this->KeyValue($k, $v, $col1X);
        }
        
        // Col 2: Order Info
        $this->SetXY($col2X, $startY);
        $this->SectionHeader('DETALLES DE LA ORDEN');
        foreach($orderDetails as $k => $v) {
            $this->KeyValue($k, $v, $col2X);
        }
        
        // Reset Y to below the lowest column
        $this->SetY($startY + 50); // Approximate height, or calculate dynamic if needed
        $this->Ln(10);
    }

    function SectionHeader($label) {
        $this->SetFont('Arial', 'B', 11);
        $this->SetTextColor(143, 25, 32);
        $this->Cell(80, 8, strtoupper($label), 'B', 2, 'L');
        $this->Ln(2);
    }

    function KeyValue($key, $value, $x) {
        $this->SetX($x);
        $this->SetFont('Arial', 'B', 10);
        $this->SetTextColor(80,80,80);
        $this->Cell(35, 6, $key, 0, 0);
        $this->SetFont('Arial', '', 10);
        $this->SetTextColor(0,0,0);
        $this->Cell(45, 6, $value, 0, 1);
    }
}
