<?php
require_once __DIR__ . '/../OrderPdf.php';
require_once __DIR__ . '/BcvService.php';
require_once __DIR__ . '/PublicationService.php';

class PdfGenerationService {
    private PDO $pdo;
    private BcvService $bcvService;
    private PublicationService $publicationService;
    
    public function __construct(PDO $pdo, BcvService $bcvService, PublicationService $publicationService) {
        $this->pdo = $pdo;
        $this->bcvService = $bcvService;
        $this->publicationService = $publicationService;
    }
    
    public function generateOrderPdf(array $requestData, array $payments): string {
        $pdf = new OrderPdf();
        $pdf->AliasNbPages();
        $pdf->orderInfo = $requestData;
        $pdf->AddPage();
        
        $pricePerFolio = $this->publicationService->getPricePerFolio();
        $bcv = $this->bcvService->getRate();
        
        $totalUsd = $requestData['folios'] * $pricePerFolio;
        $subtotalBs = $totalUsd * $bcv;
        
        $clientData = [
            'Cliente:' => $requestData['name'],
            'Documento:' => $requestData['document'],
            'Email:' => $requestData['email'] ?? '---',
            'Telefono:' => $requestData['phone'] ?? '---'
        ];
        
        $orderDetails = [
            'Estado:' => $requestData['status'],
            'Tipo:' => $requestData['pub_type'] ?? 'Documento',
            'Folios:' => $requestData['folios'],
            'Tasa BCV:' => number_format($bcv, 2)
        ];

        $pdf->InfoSection($clientData, $orderDetails);
        
        $ivaBs = $subtotalBs * 0.16;
        $totalBs = $subtotalBs + $ivaBs;

        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(50, 6, 'Total Estimado (Bs):', 0, 0);
        $pdf->SetTextColor(143, 25, 32); 
        $pdf->Cell(0, 6, number_format($totalBs, 2).' Bs', 0, 1);
        $pdf->SetTextColor(0); 
        $pdf->Ln(5);

        // Pagos
        $pdf->SectionHeader('PAGOS REGISTRADOS');
        
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->SetTextColor(143, 25, 32);
        $pdf->Cell(30, 8, 'Fecha', 'B', 0, 'C', false);
        $pdf->Cell(40, 8, 'Referencia', 'B', 0, 'C', false);
        $pdf->Cell(40, 8, 'Banco', 'B', 0, 'C', false);
        $pdf->Cell(30, 8, 'Monto (Bs)', 'B', 0, 'C', false);
        $pdf->Cell(30, 8, 'Estado', 'B', 1, 'C', false);
        
        $pdf->SetFont('Arial', '', 9);
        $pdf->SetTextColor(0);
        $totalPaid = 0;
        
        foreach($payments as $py) {
            $amount = isset($py['amount_bs']) ? (float)$py['amount_bs'] : 0.0;
            if($py['status'] == 'Aprobado') $totalPaid += $amount;
            
            $pdf->Cell(30, 8, substr($py['date'], 0, 10), 'B', 0, 'C');
            $pdf->Cell(40, 8, $py['ref'], 'B', 0, 'C');
            $pdf->Cell(40, 8, $py['bank'], 'B', 0, 'C');
            $pdf->Cell(30, 8, number_format($amount, 2), 'B', 0, 'R');
            $pdf->Cell(30, 8, $py['status'], 'B', 1, 'C');
        }
        
        if(empty($payments)) {
            $pdf->Cell(170, 7, 'No hay pagos registrados', 1, 1, 'C');
        }
        
        $pdf->Ln(2);
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(110, 7, '', 0, 0);
        $pdf->Cell(30, 7, 'Total Pagado:', 0, 0, 'R');
        $pdf->Cell(30, 7, number_format($totalPaid, 2).' Bs', 0, 1, 'R');

        $pdf->Ln(15);
        $pdf->SetFont('Arial', '', 10);
        $pdf->SetTextColor(100, 100, 100);
        $pdf->Cell(0, 5, 'Fecha de Emision: ' . ($requestData['date'] ?? date('Y-m-d')), 0, 1, 'R');
        
        return $pdf->Output('S');
    }
}
