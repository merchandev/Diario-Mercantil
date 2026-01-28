<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';
require_once __DIR__.'/BcvScraper.php';

class RateController {
  private function getSetting(PDO $pdo, string $key): ?string {
    $stmt = $pdo->prepare('SELECT value FROM settings WHERE `key`=?');
    $stmt->execute([$key]);
    $v = $stmt->fetchColumn();
    return $v === false ? null : (string)$v;
  }
  private function setSetting(PDO $pdo, string $key, string $value): void {
    $now = gmdate('Y-m-d H:i:s');
    $stmt = $pdo->prepare('INSERT INTO settings(`key`, value, created_at, updated_at) VALUES(?, ?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)');
    $stmt->execute([$key, $value, $now, $now]);
  }

  public function bcv(){
    try {
        $pdo = Database::pdo();
        $force = isset($_GET['force']) && $_GET['force'] === '1';
        $data = BcvScraper::getRates($force);

        // Optional fallback provider when BCV markup doesn't expose numbers
        // Enabled by default unless BCV_FALLBACK=0
        $useFallback = getenv('BCV_FALLBACK') !== '0';
        if ($useFallback) {
          $needUsd = empty($data['rates']['USD']['value']);
          $needEur = empty($data['rates']['EUR']['value']);
          if ($needUsd || $needEur) {
            error_log('[RateController] ⚠️ BCV scrape incomplete, attempting fallback. Info: ' . json_encode($data['error'] ?? 'missing_values'));
            try {
              $fb = $this->fallbackRates();
              if ($needUsd && isset($fb['USD'])) {
                $data['rates']['USD'] = ['raw'=>(string)$fb['USD'], 'value'=>(float)$fb['USD']];
              }
              if ($needEur && isset($fb['EUR'])) {
                $data['rates']['EUR'] = ['raw'=>(string)$fb['EUR'], 'value'=>(float)$fb['EUR']];
              }
              if (!empty($fb['source'])) { $data['source_url'] = $fb['source']; }
            } catch (Throwable $e) {
              error_log('[RateController] ❌ Fallback failed: ' . $e->getMessage());
            }
          }
        }

        // Persist latest USD rate for reuse by other parts of the system
        $usd = isset($data['rates']['USD']['value']) ? (float)$data['rates']['USD']['value'] : null;
        if ($usd !== null && $usd > 0) {
          $this->setSetting($pdo, 'bcv_rate', (string)$usd);
          $this->setSetting($pdo, 'bcv_rate_live_at', $data['fetched_at'] ?? gmdate('c'));
        }

        $resp = [
          // Backward compatibility
          'rate' => $usd ?? (float)($this->getSetting($pdo,'bcv_rate') ?: 0),
          // Extended fields
          'usd'  => [
            'raw' => $data['rates']['USD']['raw'] ?? null,
            'value' => $data['rates']['USD']['value'] ?? null,
          ],
          'eur'  => [
            'raw' => $data['rates']['EUR']['raw'] ?? null,
            'value' => $data['rates']['EUR']['value'] ?? null,
          ],
          'date_iso'   => $data['date_iso'] ?? null,
          'fetched_at' => $data['fetched_at'] ?? gmdate('c'),
          'from_cache' => !empty($data['from_cache']),
          'source_url' => $data['source_url'] ?? 'https://www.bcv.org.ve/',
        ];
        return Response::json($resp);
    } catch (\Throwable $e) {
        error_log('[RateController] Critical Error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
        return Response::json(['error' => 'server_error', 'message' => $e->getMessage()], 500);
    }
  }

  public function bcvHtml(){
    $force = isset($_GET['force']) && $_GET['force'] === '1';
    $data = BcvScraper::getRates($force);
    // Read Unidad Tributaria (Bs) from settings; default to 43.00
    try {
      $pdo = Database::pdo();
      $rawUt = $this->getSetting($pdo, 'unit_tax_bs');
      $utNum = is_numeric($rawUt) ? (float)$rawUt : 43.0;
    } catch (\Throwable $e) {
      $utNum = 43.0;
    }
    // Format as Venezuelan decimal with comma
    $utStr = number_format($utNum, 2, ',', '.');
    $html = BcvScraper::renderTickerSection($data, [ 'show_seniat' => true, 'seniat_value' => $utStr, 'decimals' => 2 ]);
    header('Content-Type: text/html; charset=UTF-8');
    echo $html;
  }

  // Fallback rates provider (exchangerate.host) returning VES per USD/EUR
  private function fallbackRates(): array {
    // Use open.er-api.com which doesn't require a key, overrideable via env
    $base = getenv('BCV_FALLBACK_URL') ?: 'https://open.er-api.com/v6/latest/';
    $getJson = function(string $url){
      $ctx = stream_context_create([
        'http' => [
          'method' => 'GET',
          'timeout' => 10,
          'header' => "User-Agent: Dashboard/1.0\r\nAccept: application/json\r\n",
        ]
      ]);
      $raw = @file_get_contents($url, false, $ctx);
      if ($raw === false) throw new RuntimeException('fallback_http_failed');
      $j = json_decode($raw, true);
      if (!is_array($j)) throw new RuntimeException('fallback_json_invalid');
      return $j;
    };

    $usd = null; $eur = null; $source = $base;
    // USD->VES via open.er-api.com
    $j1 = $getJson($base.'USD');
    if (isset($j1['rates']['VES']) && is_numeric($j1['rates']['VES'])) $usd = (float)$j1['rates']['VES'];
    // EUR->VES via open.er-api.com
    $j2 = $getJson($base.'EUR');
    if (isset($j2['rates']['VES']) && is_numeric($j2['rates']['VES'])) $eur = (float)$j2['rates']['VES'];
    return ['USD'=>$usd, 'EUR'=>$eur, 'source'=>$source];
  }
}
