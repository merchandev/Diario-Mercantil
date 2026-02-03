<?php

class SimplePdf {
    private $buffer = '';
    private $pageContent = '';

    public function __construct() {
        $this->out('%PDF-1.4');
        $this->out('%');
        $this->addObject(); // Root / Catalog
        $this->addObject(); // Pages
        $this->addObject(); // Page (1)
        $this->addObject(); // Content
        $this->addObject(); // Font
    }

    private function addObject() {
        $this->currentObject++;
        $this->objects[$this->currentObject] = strlen($this->buffer);
        $this->out($this->currentObject . ' 0 obj');
        if ($this->currentObject === 1) $this->out('<</Type /Catalog /Pages 2 0 R>>');
        if ($this->currentObject === 2) $this->out('<</Type /Pages /Kids [3 0 R] /Count 1>>');
        if ($this->currentObject === 3) $this->out('<</Type /Page /Parent 2 0 R /Resources <</Font <</F1 5 0 R>> >> /MediaBox [0 0 595 842] /Contents 4 0 R>>');
        if ($this->currentObject === 5) $this->out('<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>');
    }

    private function out($s) {
        $this->buffer .= $s . "\n";
    }

    private function endObj() {
        $this->out('endobj');
    }

    // Add text at specific coordinates (x,y) from bottom-left
    public function text($x, $y, $txt, $size=12) {
        $txt = str_replace(['(', ')', '\\'], ['\\(', '\\)', '\\\\'], $txt);
        $this->pageContent .= "BT /F1 $size Tf $x $y Td ($txt) Tj ET\n";
    }

    public function render() {
        // Content object (4)
        $this->out('<< /Length ' . strlen($this->pageContent) . ' >>');
        $this->out('stream');
        $this->out($this->pageContent);
        $this->out('endstream');
        $this->endObj();

        // Close other objects
        $this->out('5 0 obj');
        $this->out('<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>');
        $this->endObj();

        // Xref
        $xrefOffset = strlen($this->buffer);
        $this->out('xref');
        $this->out('0 ' . ($this->currentObject + 1));
        $this->out('0000000000 65535 f ');
        foreach ($this->objects as $offset) {
            $this->out(sprintf('%010d 00000 n ', $offset));
        }
        
        // Trailer
        $this->out('trailer');
        $this->out('<</Size ' . ($this->currentObject + 1) . ' /Root 1 0 R>>');
        $this->out('startxref');
        $this->out($xrefOffset);
        $this->out('%%EOF');

        return $this->buffer;
    }
    
    // Helper to format PDF stream text
    public static function simpleText($x, $y, $txt, $size=12) {
        $txt = str_replace(['(', ')', '\\'], ['\\(', '\\)', '\\\\'], $txt);
        return "BT /F1 $size Tf $x $y Td ($txt) Tj ET\n";
    }
}
