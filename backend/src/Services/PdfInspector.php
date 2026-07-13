<?php
declare(strict_types=1);

final class PdfInspector
{
    public function pageCount(string $path): int
    {
        // Try pdfinfo if available
        $command = ['pdfinfo', $path];
        
        $descriptorspec = [
           1 => ["pipe", "w"], // stdout
           2 => ["pipe", "w"]  // stderr
        ];

        $process = proc_open('pdfinfo ' . escapeshellarg($path), $descriptorspec, $pipes);
        
        if (is_resource($process)) {
            $stdout = stream_get_contents($pipes[1]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            $return_value = proc_close($process);
            
            if ($return_value === 0 && preg_match('/^Pages:\s+(\d+)$/mi', $stdout, $matches)) {
                return (int)$matches[1];
            }
        }
        
        // Fallback to basic regex (only if pdfinfo fails/is missing)
        $content = @file_get_contents($path);
        if ($content && preg_match_all('/\/Type\s*\/Page[\s\/>]/', $content, $m)) {
            return count($m[0]);
        }
        
        return 1;
    }
}
