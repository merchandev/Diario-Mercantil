<?php
class Response {
  public static function json($data, $code=200): void {
    http_response_code($code);
    header("Content-Type: application/json");
    echo json_encode($data);
    exit;
  }

  public static function sseHeaders(): void {
    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('X-Accel-Buffering: no');
    if (ob_get_level()) ob_end_clean();
  }
}
