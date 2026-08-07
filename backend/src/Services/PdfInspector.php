<?php

declare(strict_types=1);

final class PdfInspectionException extends RuntimeException {}

final class PdfInspector
{
    public function __construct(private string $binary = 'pdfinfo') {}

    public function pageCount(string $filePath): int
    {
        if (!is_file($filePath) || !is_readable($filePath)) {
            throw new PdfInspectionException('El PDF no existe o no es legible.');
        }

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = @proc_open([$this->binary, $filePath], $descriptors, $pipes);
        if (!is_resource($process)) {
            throw new PdfInspectionException('No se pudo iniciar pdfinfo.');
        }

        fclose($pipes[0]);
        $stdout = stream_get_contents($pipes[1]) ?: '';
        $stderr = stream_get_contents($pipes[2]) ?: '';
        fclose($pipes[1]);
        fclose($pipes[2]);

        $exitCode = proc_close($process);
        if ($exitCode !== 0) {
            error_log('[pdfinfo] exit=' . $exitCode . ' stderr=' . trim($stderr));
            throw new PdfInspectionException('El archivo no pudo ser inspeccionado como PDF válido.');
        }

        if (!preg_match('/^Pages:\s*(\d+)\s*$/mi', $stdout, $match)) {
            throw new PdfInspectionException('pdfinfo no devolvió un número de páginas válido.');
        }

        $pages = (int) $match[1];
        if ($pages < 1) {
            throw new PdfInspectionException('El PDF no contiene páginas válidas.');
        }

        return $pages;
    }
}
