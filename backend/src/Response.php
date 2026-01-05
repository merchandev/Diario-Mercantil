<?php
class Response {
  public static function json($data, $code=200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
  }
  public static function sseHeaders() {
    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('Connection: keep-alive');
  }
}
