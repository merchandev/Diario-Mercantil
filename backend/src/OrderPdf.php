<?php
require_once __DIR__.'/fpdf.php';

class OrderPdf extends FPDF {
    public $title = 'ORDEN DE SERVICIO';
    public $orderInfo = [];

    function Header() {
        // Brand Color Background: #8f1920 (RGB: 143, 25, 32)
        $this->SetFillColor(143, 25, 32);
        $this->Rect(0, 0, 210, 40, 'F');
        
        // Logo
        // Use absolute path for safety
        $logoPath = realpath(__DIR__.'/../public/logo-blanco.png');
        if($logoPath && file_exists($logoPath)) {
            $this->Image($logoPath, 10, 8, 50);
        }
        
        // Title
        $this->SetFont('Arial', 'B', 20);
        $this->SetTextColor(255, 255, 255);
        $this->Cell(0, 15, '', 0, 1); // Spacer
        $this->SetXY(110, 10);
        $this->Cell(90, 10, $this->title, 0, 1, 'R');
        
        // Order Number & Date
        $this->SetFont('Arial', '', 10);
        if(!empty($this->orderInfo)) {
             $orderNo = $this->orderInfo['order_no'] ?? $this->orderInfo['id'] ?? '---';
             $this->SetXY(110, 20);
             $this->Cell(90, 5, 'Orden #: ' . $orderNo, 0, 1, 'R');
             $this->SetXY(110, 25);
             $this->Cell(90, 5, 'Fecha: ' . ($this->orderInfo['date'] ?? date('Y-m-d')), 0, 1, 'R');
        }

        $this->Ln(15);
    }

    function Footer() {
        $this->SetY(-15);
        $this->SetFont('Arial', 'I', 8);
        $this->SetTextColor(128, 128, 128);
        $this->Cell(0, 10, 'Pagina '.$this->PageNo().'/{nb} - Diario Mercantil de Venezuela', 0, 0, 'C');
    }
    
    function SectionTitle($label) {
        $this->SetFont('Arial', 'B', 12);
        // Darker gray for section text
        $this->SetTextColor(50, 50, 50);
        $this->SetFillColor(240, 240, 240); // Light gray bg
        $this->Cell(0, 8, "  $label", 0, 1, 'L', true);
        $this->Ln(2);
    }

    function KeyValueRow($key, $value) {
        $this->SetFont('Arial', 'B', 10);
        $this->SetTextColor(0,0,0);
        $this->Cell(50, 6, $key, 0, 0);
        $this->SetFont('Arial', '', 10);
        $this->Cell(0, 6, $value, 0, 1);
    }
}
