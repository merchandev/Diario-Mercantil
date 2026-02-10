<?php
require_once __DIR__.'/fpdf.php';

class OrderPdf extends FPDF {
    public $title = 'ORDEN DE SERVICIO';
    public $orderInfo = [];

    function Header() {
        // Brand Color Background: #8f1920 (RGB: 143, 25, 32)
        $this->SetFillColor(143, 25, 32);
        // Extended header height for modern look
        $this->Rect(0, 0, 210, 45, 'F');
        
        // Logo - Larger
        $logoPath = realpath(__DIR__.'/../public/logo-blanco.png');
        if($logoPath && file_exists($logoPath)) {
            // Increased width to 70
            $this->Image($logoPath, 10, 10, 70);
        }
        
        // Title
        $this->SetFont('Arial', 'B', 24); // Larger font
        $this->SetTextColor(255, 255, 255);
        $this->SetXY(110, 12);
        $this->Cell(90, 10, $this->title, 0, 1, 'R');
        
        // Order Number & Date
        $this->SetFont('Arial', '', 11);
        if(!empty($this->orderInfo)) {
             $orderNo = $this->orderInfo['order_no'] ?? $this->orderInfo['id'] ?? '---';
             $this->SetXY(110, 24);
             $this->Cell(90, 6, 'Orden #: ' . $orderNo, 0, 1, 'R');
             $this->SetXY(110, 30);
             $this->Cell(90, 6, 'Fecha: ' . ($this->orderInfo['date'] ?? date('Y-m-d')), 0, 1, 'R');
        }

        $this->Ln(20);
    }

    function Footer() {
        $this->SetY(-15);
        $this->SetFont('Arial', 'I', 8);
        $this->SetTextColor(128, 128, 128);
        $this->Cell(0, 10, 'Pagina '.$this->PageNo().'/{nb} - Diario Mercantil de Venezuela', 0, 0, 'C');
    }
    
    function SectionTitle($label) {
        $this->SetFont('Arial', 'B', 12);
        $this->SetTextColor(143, 25, 32); // Brand color for section titles
        $this->SetFillColor(255, 255, 255); // No gray bg, just clean white
        $this->Cell(0, 10, strtoupper($label), 'B', 1, 'L', false); // Bottom border line
        $this->Ln(4);
    }

    function KeyValueRow($key, $value) {
        $this->SetFont('Arial', 'B', 10);
        $this->SetTextColor(80,80,80);
        $this->Cell(50, 7, $key, 0, 0);
        $this->SetFont('Arial', '', 10);
        $this->SetTextColor(0,0,0);
        $this->Cell(0, 7, $value, 0, 1);
    }
}
