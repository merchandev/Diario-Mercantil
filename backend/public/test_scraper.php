<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/plain');

echo "=== DIAGNOSTICO DE SCRAPER BCV ===\n";
echo "Fecha Servidor: " . date('Y-m-d H:i:s') . "\n";
echo "PHP Version: " . phpversion() . "\n";

// 1. Verificaciones de Extensiones
echo "\n[1] Verificando Extensiones:\n";
$exts = ['curl', 'openssl', 'json', 'dom', 'libxml'];
foreach ($exts as $ext) {
    echo "  - $ext: " . (extension_loaded($ext) ? "OK" : "FALTA ❌") . "\n";
}

// 2. Prueba BCV Oficial
echo "\n[2] Prueba Conexión BCV Oficial (cURL):\n";
$url_bcv = 'https://www.bcv.org.ve/';
test_curl($url_bcv);

// 3. Prueba Fallback API
echo "\n[3] Prueba Conexión Fallback API (cURL):\n";
$url_api = 'https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page?page=bcv';
test_curl($url_api);

// 4. Prueba Lógica BcvScraper (Si existe)
echo "\n[4] Prueba Clase BcvScraper:\n";
if (file_exists(__DIR__.'/../src/BcvScraper.php')) {
    require_once __DIR__.'/../src/BcvScraper.php';
    try {
        echo "  Intentando BcvScraper::getRates(true)...\n";
        $data = BcvScraper::getRates(true);
        echo "  Resultado:\n";
        print_r($data);
    } catch (Throwable $e) {
        echo "  Excepción: " . $e->getMessage() . "\n";
    }
} else {
    echo "  No se encontró src/BcvScraper.php (¿Ruta incorrecta?)\n";
}

function test_curl($url) {
    if (!function_exists('curl_init')) {
        echo "  SKIP: cURL no disponible.\n";
        return;
    }
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Ignorar certs inválidos del BCV
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    // Verbose debug
    curl_setopt($ch, CURLOPT_VERBOSE, false);
    
    $result = curl_exec($ch);
    $info = curl_getinfo($ch);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($result === false) {
        echo "  ❌ FALLO: $error\n";
    } else {
        echo "  ✅ ÉXITO (HTTP {$info['http_code']})\n";
        echo "  Tamaño descargado: " . strlen($result) . " bytes\n";
        if (strlen($result) < 500) {
            echo "  Contenido (primeros 500 chars):\n" . substr($result, 0, 500) . "\n...\n";
        }
    }
}
