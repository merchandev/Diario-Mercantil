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

            if (!$fileData || empty($fileData['path'])) {
                throw new RuntimeException("La orden {$orderId} no tiene un PDF de documento asociado. No se puede generar una edición incompleta.", 422);
            }

            try {
                $physicalPath = StoragePath::getFile((string)$fileData['path']);
                $pageCount = $pdf->setSourceFile($physicalPath);
                if ($pageCount < 1) {
                    throw new RuntimeException("El PDF de la orden {$orderId} no contiene páginas válidas.", 422);
                }
                for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                    $templateId = $pdf->importPage($pageNo);
                    $size = $pdf->getTemplateSize($templateId);
                    $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                    $pdf->useTemplate($templateId);
                }
            } catch (Throwable $e) {
                if ($e instanceof RuntimeException && $e->getCode() === 422) {
                    throw $e;
                }
                throw new RuntimeException("No se pudo incorporar el PDF de la orden {$orderId}: " . $e->getMessage(), 422, $e);
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
        if (!is_dir($storageRoot) || !is_writable($storageRoot)) {
            throw new RuntimeException('El directorio de almacenamiento de ediciones no está disponible para escritura.', 500);
        }

        $pdf->Output('F', $outputPath);
        if (!is_file($outputPath) || filesize($outputPath) <= 0) {
            throw new RuntimeException('No se pudo generar el PDF final de la edición.', 500);
        }

        return $outputName;
    }
}

