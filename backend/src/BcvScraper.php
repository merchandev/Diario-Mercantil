<?php
/**
 * BCV Scraper utility
 * - Fetches https://www.bcv.org.ve/ and extracts USD/EUR from #dolar and #euro blocks
 * - Normalizes decimals (comma/point) and returns floats
 * - Extracts "Fecha Valor" via span.date-display-single[content] when available
 * - Caches to a temp file to reduce requests and provide fallback
 * - Optional: render a Tailwind section similar to Frontend ticker
 */

declare(strict_types=1);

final class BcvScraper
{
    public const BCV_URL = 'https://www.bcv.org.ve/';
    public const CACHE_TTL_SECONDS = 1800; // 30 minutes
    public const HTTP_TIMEOUT = 20;
    public const HTTP_CONNECT_TO = 10;

    public static function getRates(bool $forceRefresh = false): array
    {
        $cacheFile = self::cachePath();
        if (!$forceRefresh) {
            $cached = self::cacheReadValid($cacheFile, self::CACHE_TTL_SECONDS);
            if ($cached !== null) {
                $cached['from_cache'] = true;
                return $cached;
            }
        }
        try {
            $fresh = self::fetchAndParse(self::BCV_URL);
            $fresh['from_cache'] = false;
            self::cacheWrite($cacheFile, $fresh);
            return $fresh;
        } catch (\Throwable $e) {
            // Attempt 3rd party fallback for BCV data
            try {
                $fallback = self::fetchFromApiProvider();
                if ($fallback) {
                    $fallback['from_cache'] = false;
                    $fallback['warning'] = 'Using API fallback due to main site failure: ' . $e->getMessage();
                    self::cacheWrite($cacheFile, $fallback);
                    return $fallback;
                }
            } catch (\Throwable $e2) {
                // Ignore fallback error and proceed to cache/error
            }

            $stale = self::cacheReadAny($cacheFile);
            if ($stale !== null) {
                $stale['from_cache'] = true;
                $stale['warning'] = 'Using cache due to fetch error: ' . $e->getMessage();
                return $stale;
            }
            return [
                'source_url' => self::BCV_URL,
                'date_iso'   => null,
                'rates'      => [ 'USD' => null, 'EUR' => null ],
                'fetched_at' => gmdate('c'),
                'from_cache' => false,
                'error'      => $e->getMessage(),
            ];
        }
    }

    public static function renderTickerSection(array $data, array $options = []): string
    {
        $opts = array_merge([
            'show_seniat' => true,
            // Default UT to 43,00 Bs; controller may override from settings
            'seniat_value' => '43,00',
            'decimals' => 2,
        ], $options);

        $usdStr = 'N/D';
        $eurStr = 'N/D';

        if (!empty($data['rates']['USD']['value'])) {
            $usdStr = 'Bs/USD ' . self::formatVe((float)$data['rates']['USD']['value'], $opts['decimals']);
        } elseif (!empty($data['rates']['USD']['raw'])) {
            $usdStr = 'Bs/USD ' . htmlspecialchars((string)$data['rates']['USD']['raw'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }

        if (!empty($data['rates']['EUR']['value'])) {
            $eurStr = 'Bs/EUR ' . self::formatVe((float)$data['rates']['EUR']['value'], $opts['decimals']);
        } elseif (!empty($data['rates']['EUR']['raw'])) {
            $eurStr = 'Bs/EUR ' . htmlspecialchars((string)$data['rates']['EUR']['raw'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }

        $dateIso = $data['date_iso'] ?? null;
        $dateTitle = $dateIso ? 'Fecha Valor: ' . $dateIso : 'BCV';
        $fromCacheBadge = (!empty($data['from_cache'])) ? ' (cache)' : '';

        $seniatHtml = '';
        if (!empty($opts['show_seniat'])) {
            $seniatHtml = '<div class="text-slate-600">Unidad tributaria (SENIAT): <span class="font-medium text-slate-900">'
                . htmlspecialchars((string)$opts['seniat_value'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
                . ' Bs.</span></div>';
        }

        return
            '<section class="bg-slate-100 py-[10px]" title="' . htmlspecialchars($dateTitle, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '">' .
                '<div class="mx-auto max-w-7xl px-4 flex items-center gap-4 text-sm">' .
                    '<span class="px-2 py-1 rounded-lg bg-brand-600 text-white text-xs">EN DIRECTO</span>' .
                    '<div class="flex-1 flex gap-6 overflow-x-auto">' .
                        '<div class="text-slate-600">Tipo de cambio (BCV) hoy' . $fromCacheBadge . ': ' .
                            '<span class="font-medium text-slate-900">' . htmlspecialchars($usdStr, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</span> | ' .
                            '<span class="font-medium text-slate-900">' . htmlspecialchars($eurStr, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</span>' .
                        '</div>' .
                        $seniatHtml .
                    '</div>' .
                '</div>' .
            '</section>';
    }

    private static function fetchAndParse(string $url): array
    {
        $html = self::httpGet($url);
        if ($html === '' || $html === false) {
            throw new \RuntimeException('BCV HTML download failed');
        }
        libxml_use_internal_errors(true);
        $dom = new \DOMDocument();
        $htmlEnc = mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8');
        if (!$dom->loadHTML($htmlEnc)) {
            throw new \RuntimeException('BCV HTML parse failed');
        }
        libxml_clear_errors();
        $xp = new \DOMXPath($dom);

        $dateIso = self::extractDateIso($xp);
        $usd     = self::extractRate($xp, 'dolar');
        $eur     = self::extractRate($xp, 'euro');

        // Regex fallbacks if XPath selectors failed (markup frequently changes)
        if ($usd === null) {
            $usd = self::extractRateByRegex($html, 'USD');
        }
        if ($eur === null) {
            $eur = self::extractRateByRegex($html, 'EUR');
        }

        return [
            'source_url' => $url,
            'date_iso'   => $dateIso,
            'rates'      => [ 'USD' => $usd, 'EUR' => $eur ],
            'fetched_at' => gmdate('c'),
        ];
    }

    private static function extractRate(\DOMXPath $xp, string $id): ?array
    {
        $nodes = $xp->query("//div[@id='$id']//strong");
        if (!$nodes || $nodes->length === 0) {
            $nodes = $xp->query("//div[@id='$id']//div[contains(@class,'centrado')]//strong");
        }
        if (!$nodes || $nodes->length === 0) {
            return null;
        }
        $raw = trim(preg_replace('/\s+/u', ' ', $nodes->item(0)?->textContent ?? ''));
        if ($raw === '') {
            return null;
        }
        $value = self::normalizeDecimal($raw);
        if (!is_finite($value)) {
            return ['raw' => $raw, 'value' => null];
        }
        return ['raw' => $raw, 'value' => $value];
    }

    private static function extractRateByRegex(string $html, string $currency): ?array
    {
        $patterns = [];
        if (strtoupper($currency) === 'USD') {
            $patterns = [
                '/id=\"dolar\"[\s\S]*?<strong>\s*([0-9\.,]+)\s*<\/strong>/i',
                '/D[oó]lar\s+estadounidense\s*\(USD\)[\s\S]*?<strong>\s*([0-9\.,]+)\s*<\/strong>/iu',
                '/USD[^\d]{0,40}([0-9][0-9\.,]*)/iu',
            ];
        } else {
            $patterns = [
                '/id=\"euro\"[\s\S]*?<strong>\s*([0-9\.,]+)\s*<\/strong>/i',
                '/Euro\s*\(EUR\)[\s\S]*?<strong>\s*([0-9\.,]+)\s*<\/strong>/iu',
                '/EUR[^\d]{0,40}([0-9][0-9\.,]*)/iu',
            ];
        }
        foreach ($patterns as $re) {
            if (preg_match($re, $html, $m)) {
                $raw = trim($m[1]);
                $val = self::normalizeDecimal($raw);
                if (is_finite($val)) return ['raw'=>$raw, 'value'=>$val];
                return ['raw'=>$raw, 'value'=>null];
            }
        }
        return null;
    }

    private static function extractDateIso(\DOMXPath $xp): ?string
    {
        $nodes = $xp->query("//span[contains(@class,'date-display-single')][@content]");
        if ($nodes && $nodes->length > 0) {
            $el = $nodes->item(0);
            if ($el instanceof \DOMElement) {
                $content = $el->getAttribute('content');
                return $content !== '' ? $content : null;
            }
        }
        return null;
    }

    private static function httpGet(string $url): string|false
    {
        if (function_exists('curl_init')) {
            $ch = curl_init();
            $headers = [
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language: es-VE,es;q=0.9,en;q=0.8',
                'Cache-Control: no-cache',
                'Pragma: no-cache',
                'Connection: keep-alive',
                'Upgrade-Insecure-Requests: 1',
            ];
            curl_setopt_array($ch, [
                CURLOPT_URL            => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_MAXREDIRS      => 5,
                CURLOPT_CONNECTTIMEOUT => self::HTTP_CONNECT_TO,
                CURLOPT_TIMEOUT        => self::HTTP_TIMEOUT,
                // Relax SSL for BCV as their certs are often invalid/expired
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => 0,
                CURLOPT_HTTPHEADER     => $headers,
                CURLOPT_ENCODING       => '',
                CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ]);
            $body = curl_exec($ch);
            $errNo = curl_errno($ch);
            $err   = curl_error($ch);
            $code  = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($errNo !== 0) {
                throw new \RuntimeException("HTTP error (cURL): $err");
            }
            if ($code < 200 || $code >= 400) {
                throw new \RuntimeException("HTTP $code for $url");
            }
            return $body;
        }
        $ctx = stream_context_create([
            'http' => [
                'method'  => 'GET',
                'timeout' => self::HTTP_TIMEOUT,
                'header'  => "User-Agent: Mozilla/5.0\r\nAccept: text/html\r\nAccept-Language: es-VE,es;q=0.9,en;q=0.8\r\n",
            ],
            'ssl' => [
                'verify_peer'      => true,
                'verify_peer_name' => true,
            ],
        ]);
        $body = @file_get_contents($url, false, $ctx);
        if ($body === false) {
            $e = error_get_last();
            $msg = $e['message'] ?? 'unknown error';
            throw new \RuntimeException("HTTP fetch failed (streams): $msg");
        }
        return $body;
    }

    private static function normalizeDecimal(string $s): float
    {
        $s = html_entity_decode($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $s = preg_replace('/[^\d,\.]/u', '', $s) ?? '';
        $lastComma = strrpos($s, ',');
        $lastDot   = strrpos($s, '.');
        if ($lastComma !== false && $lastDot !== false) {
            $decimalSep  = ($lastComma > $lastDot) ? ',' : '.';
            $thousandSep = ($decimalSep === ',') ? '.' : ',';
            $s = str_replace($thousandSep, '', $s);
            $s = str_replace($decimalSep, '.', $s);
        } elseif ($lastComma !== false) {
            $s = str_replace(',', '.', $s);
        }
        if ($s === '' || $s === '.' || $s === '-.') {
            return NAN;
        }
        return (float)$s;
    }

    private static function formatVe(float $n, int $decimals = 2): string
    {
        return number_format($n, $decimals, ',', '.');
    }

    private static function cachePath(): string
    {
        $dir = sys_get_temp_dir();
        return rtrim($dir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'bcv_rates_cache.json';
    }

    private static function cacheReadValid(string $file, int $ttl): ?array
    {
        if (!is_file($file)) return null;
        $meta = @stat($file); if (!$meta) return null;
        $age = time() - (int)($meta['mtime'] ?? time());
        if ($age > $ttl) return null;
        $raw = @file_get_contents($file); if ($raw === false) return null;
        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }

    private static function cacheReadAny(string $file): ?array
    {
        if (!is_file($file)) return null;
        $raw = @file_get_contents($file); if ($raw === false) return null;
        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }

    private static function cacheWrite(string $file, array $data): void
    {
        $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
        $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) return;
        @file_put_contents($tmp, $json);
        @rename($tmp, $file);
    }
    private static function fetchFromApiProvider(): ?array
    {
        // Public API from pydolarvenezuela
        $url = 'https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page?page=bcv';
        
        try {
            $json = self::httpGet($url);
        } catch (\Throwable $e) {
            return null;
        }

        if ($json === '' || $json === false) return null;
        
        $data = json_decode($json, true);
        if (!is_array($data)) return null;
        
        // Structure: { monitors: { usd: { price: float }, eur: { price: float } }, datetime: { date: string } }
        $usdVal = $data['monitors']['usd']['price'] ?? null;
        $eurVal = $data['monitors']['eur']['price'] ?? null;
        $dateStr = $data['datetime']['date'] ?? null; // e.g. "2024-01-28"

        if (!$usdVal && !$eurVal) return null;

        return [
            'source_url' => 'https://pydolarvenezuela-api.vercel.app',
            'date_iso'   => $dateStr,
            'rates'      => [
                'USD' => $usdVal ? ['raw' => (string)$usdVal, 'value' => (float)$usdVal] : null,
                'EUR' => $eurVal ? ['raw' => (string)$eurVal, 'value' => (float)$eurVal] : null,
            ],
            'fetched_at' => gmdate('c'),
        ];
    }
}
