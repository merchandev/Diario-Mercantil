<?php

declare(strict_types=1);

class LegalSubmissionValidator {
    public static function validate(PDO $pdo, int $requestId, array $req): void {
        // 1. Datos requeridos
        if (empty(trim($req['name'] ?? ''))) {
            throw new Exception("El nombre o razón social es obligatorio.", 400);
        }
        if (empty(trim($req['document'] ?? ''))) {
            throw new Exception("El documento (RIF/CI) es obligatorio.", 400);
        }

        // 2. Folios
        $folios = (int)($req['folios'] ?? 0);
        if ($folios <= 0) {
            throw new Exception("La solicitud debe tener al menos 1 folio o página.", 400);
        }

        // 3. Cálculo comercial
        $totalBs = (float)($req['total_bs'] ?? 0);
        if ($totalBs <= 0) {
            throw new Exception("El cálculo comercial (Total Bs) no está almacenado o es 0. Recalcule el monto.", 400);
        }

        // 4. Archivos adjuntos
        $stmt = $pdo->prepare("SELECT kind FROM legal_files WHERE legal_request_id = ?");
        $stmt->execute([$requestId]);
        $files = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($files)) {
            throw new Exception("Debe adjuntar al menos un documento para enviar la solicitud.", 400);
        }

        $pubType = $req['pub_type'] ?? 'Documento';
        if ($pubType === 'Documento') {
            if (!in_array('document_pdf', $files) && !in_array('documento_pdf', $files)) {
                // Not sure if it's 'document_pdf' or something else, but we require at least one file.
                // Let's enforce that if it's Documento, it must have a file.
                // The prompt says "PDF obligatorio asociado".
                $hasPdf = false;
                foreach ($files as $f) {
                    if (str_contains($f, 'pdf') || str_contains($f, 'document')) {
                        $hasPdf = true;
                        break;
                    }
                }
                if (!$hasPdf) {
                    throw new Exception("Debe adjuntar el documento en formato PDF.", 400);
                }
            }
        } elseif ($pubType === 'Convocatoria') {
            if (!in_array('convocatoria_scan', $files) && !in_array('convocatoria_word', $files)) {
                throw new Exception("Debe adjuntar el texto (Word) o imagen escaneada de la convocatoria.", 400);
            }
        }
    }
}
