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

    public function generate(int $editionId, array $orderIds, ?callable $progressCallback = null): string {
        $pdf = new Fpdi();
        $pdf->SetAutoPageBreak(false);

        $storageRoot = StoragePath::getUploadsDir();

        $total = count($orderIds);
        $done = 0;

        foreach ($orderIds as $orderId) {
            // The consolidated edition may only consume the immutable artifact prepared
            // for this exact edition/request pair. It must never read another request's file.
            $fStmt = $this->pdo->prepare(
                'SELECT f.path,f.checksum,eo.publication_checksum FROM edition_orders eo '
                . 'JOIN files f ON f.id=eo.publication_file_id '
                . 'WHERE eo.edition_id=? AND eo.legal_request_id=? '
                . "AND f.deleted_at IS NULL AND f.status IN ('processed','uploaded') LIMIT 1"
            );
            $fStmt->execute([$editionId, $orderId]);
            $fileData = $fStmt->fetch(PDO::FETCH_ASSOC);

            if (!$fileData || empty($fileData['path'])) {
                throw new RuntimeException("La orden {$orderId} no tiene un PDF de documento asociado. No se puede generar una edición incompleta.", 422);
            }

            try {
                $physicalPath = StoragePath::getFile((string)$fileData['path']);
                $actualChecksum = hash_file('sha256', $physicalPath);
                $expectedChecksum = (string) ($fileData['publication_checksum'] ?: $fileData['checksum']);
                if ($actualChecksum === false || !hash_equals($expectedChecksum, $actualChecksum)) {
                    throw new RuntimeException("La integridad del PDF individual de la solicitud {$orderId} no coincide.", 422);
                }
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
                error_log("[edition.pdf] No se pudo incorporar el PDF de la orden {$orderId}: " . $e->getMessage());
                throw new RuntimeException(
                    'No fue posible procesar automáticamente uno de los documentos PDF. '
                    . 'La edición se mantuvo como borrador para que pueda sustituir o corregir el archivo antes de publicarla.',
                    422,
                    $e
                );
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

        $safeCode = preg_replace('/[^A-Za-z0-9_-]/', '_', (string) $code) ?: "DM-{$editionId}";
        $relativeDir = "editions/{$editionId}/consolidated";
        $outputDir = $storageRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativeDir);
        if (!is_dir($outputDir) && !mkdir($outputDir, 0750, true) && !is_dir($outputDir)) {
            throw new RuntimeException('No se pudo crear el directorio del PDF consolidado.', 500);
        }
        $outputName = "edition_{$safeCode}_" . bin2hex(random_bytes(8)) . '.pdf';
        $relativePath = $relativeDir . '/' . $outputName;
        $outputPath = $outputDir . DIRECTORY_SEPARATOR . $outputName;
        if (!is_dir($storageRoot) || !is_writable($storageRoot)) {
            throw new RuntimeException('El directorio de almacenamiento de ediciones no está disponible para escritura.', 500);
        }

        $pdf->Output('F', $outputPath);
        if (!is_file($outputPath) || filesize($outputPath) <= 0) {
            throw new RuntimeException('No se pudo generar el PDF final de la edición.', 500);
        }

        @chmod($outputPath, 0640);
        return $relativePath;
    }
}
