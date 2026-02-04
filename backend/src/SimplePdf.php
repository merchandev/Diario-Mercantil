<?php

class SimplePdf {
    private $buffer = '';
    private $objects = []; 
    private $currentObject = 0;
    private $pageContent = '';

    public function __construct() {
        $this->out('%PDF-1.4');
    }

    private function out($s) {
        $this->buffer .= $s . "\n";
    }

    private function newObj() {
        $this->currentObject++;
        $this->objects[$this->currentObject] = strlen($this->buffer);
        $this->out($this->currentObject . ' 0 obj');
        return $this->currentObject;
    }

    private function endObj() {
        $this->out('endobj');
    }

    public function text($x, $y, $txt, $size=12) {
        // Escape special chars for PDF strings
        $txt = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $txt);
        // BT = Begin Text, Tf = Text Font, Td = Text Position, Tj = Show Text, ET = End Text
        $this->pageContent .= "BT /F1 $size Tf $x $y Td ($txt) Tj ET\n";
    }

    public function render() {
        // Obj 1: Catalog
        $this->newObj(); 
        $this->out('<</Type /Catalog /Pages 2 0 R>>');
        $this->endObj();

        // Obj 2: Pages
        $this->newObj(); 
        $this->out('<</Type /Pages /Kids [3 0 R] /Count 1>>');
        $this->endObj();

        // Obj 3: Page
        // Content will be Obj 4, Font will be Obj 5
        $this->newObj(); 
        $this->out('<</Type /Page /Parent 2 0 R /Resources <</Font <</F1 5 0 R>> >> /MediaBox [0 0 595 842] /Contents 4 0 R>>');
        $this->endObj();

        // Obj 4: Content Stream
        $this->newObj();
        $this->out('<< /Length ' . strlen($this->pageContent) . ' >>');
        $this->out('stream');
        $this->buffer .= $this->pageContent; 
        if (substr($this->pageContent, -1) !== "\n") $this->buffer .= "\n";
        $this->out('endstream');
        $this->endObj();

        // Obj 5: Font
        $this->newObj();
        // Use standard Helvetica
        $this->out('<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>');
        $this->endObj();

        // Xref Table
        $xrefOffset = strlen($this->buffer);
        $this->out('xref');
        $this->out('0 ' . ($this->currentObject + 1));
        $this->out('0000000000 65535 f '); // Entry 0
        foreach ($this->objects as $id => $offset) {
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
}
