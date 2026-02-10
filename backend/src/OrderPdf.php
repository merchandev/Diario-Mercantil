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
        
        // Edition QR Code
        if(!empty($this->orderInfo['edition_code'])) {
            $qrData = urlencode('EDICION:'.$this->orderInfo['edition_code']);
            $qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data='.$qrData;
            $this->Image($qrUrl, 85, 10, 25, 25, 'PNG');
        }
        
        // Title & Order Info - Aligned Right
        $this->SetFont('Arial', 'B', 20);
        $this->SetTextColor(255, 255, 255);
        // Adjusted X to 110 to avoid overlap with QR
        $this->SetXY(110, 10);
        $this->Cell(90, 10, $this->title, 0, 1, 'R');
        
        $this->SetFont('Arial', '', 10);
        if(!empty($this->orderInfo)) {
             $orderNo = $this->orderInfo['order_no'] ?? $this->orderInfo['id'] ?? '---';
             $this->SetXY(110, 20);
             $this->Cell(90, 6, '# ORDEN: ' . $orderNo, 0, 1, 'R');
             // Date removed as requested
             // $this->Cell(100, 6, 'FECHA: ' . ($this->orderInfo['date'] ?? date('Y-m-d')), 0, 1, 'R');
        }
        $this->Ln(25);
    }

    function Footer() {
        $this->SetY(-15);
        $this->SetFont('Arial', 'I', 8);
        $this->SetTextColor(128, 128, 128);
        $this->Cell(0, 10, utf8_decode('Página ').$this->PageNo().'/{nb} - Diario Mercantil de Venezuela', 0, 0, 'C');
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
        $this->SetY($startY + 50); 
        $this->Ln(5);
    }

    function SectionHeader($label) {
        $this->SetFont('Arial', 'B', 10);
        $this->SetTextColor(143, 25, 32);
        // Modern approach: No underline, just bold colored text, strictly uppercase
        $this->Cell(80, 8, strtoupper(utf8_decode($label)), 0, 2, 'L');
        // Add a thin light separator line below
        $this->SetDrawColor(230, 230, 230);
        $this->Line($this->GetX(), $this->GetY(), $this->GetX()+80, $this->GetY());
        $this->Ln(3);
    }

    function KeyValue($key, $value, $x) {
        $this->SetX($x);
        $this->SetFont('Arial', 'B', 9);
        $this->SetTextColor(120, 120, 120); // Gray labels
        $this->Cell(35, 6, utf8_decode($key), 0, 0);
        
        $this->SetFont('Arial', '', 9);
        $this->SetTextColor(0, 0, 0); // Black values
        $this->Cell(45, 6, utf8_decode($value), 0, 1);
    }
}
