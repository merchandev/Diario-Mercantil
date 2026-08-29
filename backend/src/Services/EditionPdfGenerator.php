<?php
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../fpdf.php';
require_once __DIR__ . '/../Http/StoragePath.php';

use setasign\Fpdi\Fpdi;

class EditionPdfGenerator {
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function generate(int $editionId, array $orderIds, callable $progressCallback = null): string {
        $pdf = new Fpdi();
        $pdf->SetAutoPageBreak(false);

        $storageRoot = StoragePath::getUploadsDir();

        $total = count($orderIds);
        $done = 0;

        foreach ($orderIds as $orderId) {
            // Find the PDF file for this order
            $fStmt = $this->pdo->prepare("SELECT f.path FROM files f JOIN legal_files lf ON lf.file_id = f.id WHERE lf.legal_request_id = ? AND lf.kind = 'document_pdf' LIMIT 1");
            $fStmt->execute([$orderId]);
            $fileData = $fStmt->fetch(PDO::FETCH_ASSOC);

            if ($fileData && !empty($fileData['path'])) {
                $physicalPath = realpath($storageRoot . '/' . $fileData['path']);
                if ($physicalPath && file_exists($physicalPath)) {
                    try {
                        $pageCount = $pdf->setSourceFile($physicalPath);
                        for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                            $templateId = $pdf->importPage($pageNo);
                            $size = $pdf->getTemplateSize($templateId);
                            $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                            $pdf->useTemplate($templateId);
                        }
                    } catch (Exception $e) {
                        // Skip if cannot parse
                    }
                }
            }
            $done++;
            if ($progressCallback) {
                $progressCallback($done, $total, "Procesando orden $orderId");
            }
        }

        if ($progressCallback) {
            $progressCallback($done, $total, "Guardando PDF...");
        }

        $codeStmt = $this->pdo->prepare("SELECT code FROM editions WHERE id = ?");
        $codeStmt->execute([$editionId]);
        $code = $codeStmt->fetchColumn() ?: "DM-$editionId";

        $outputName = "edition_{$code}_" . time() . ".pdf";
        $outputPath = $storageRoot . '/' . $outputName;

        $pdf->Output('F', $outputPath);

        return $outputName;
    }
}

