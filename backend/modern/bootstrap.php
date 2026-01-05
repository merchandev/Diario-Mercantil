<?php
declare(strict_types=1);

use DI\ContainerBuilder;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Monolog\Level;
use App\Core\Env;
use App\Services\AuthService;
use App\Core\AuthMiddleware;
use App\Core\ErrorMiddleware;
use App\Repositories\LegalRepository;
use App\Services\LegalService;

require __DIR__.'/vendor/autoload.php';

Env::load();

$builder = new ContainerBuilder();
$builder->addDefinitions([
  Logger::class => function(){
    $log = new Logger('app');
    $log->pushHandler(new StreamHandler(dirname(__DIR__).'/storage/app.log', Level::Debug));
    return $log;
  },
  PDO::class => function(){
    $path = getenv('DB_PATH') ?: dirname(__DIR__).'/storage/database.sqlite';
    $needCreate = !file_exists($path);
    $pdo = new PDO('sqlite:'.$path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Minimal schema (idempotent)
    $schema = [
      'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, document TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT "user", created_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS legal_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, status TEXT NOT NULL, name TEXT NOT NULL, document TEXT NOT NULL, date TEXT NOT NULL, folios INTEGER DEFAULT 1, user_id INTEGER, pub_type TEXT DEFAULT "Documento", meta TEXT, created_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS legal_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, legal_request_id INTEGER NOT NULL, ref TEXT, date TEXT NOT NULL, bank TEXT, type TEXT, amount_bs REAL NOT NULL, status TEXT, mobile_phone TEXT, comment TEXT, created_at TEXT NOT NULL, FOREIGN KEY(legal_request_id) REFERENCES legal_requests(id) ON DELETE CASCADE)',
      'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)'
    ];
    foreach ($schema as $sql) { $pdo->exec($sql); }
    // Seed settings if empty
    $cnt = (int)$pdo->query('SELECT COUNT(*) FROM settings')->fetchColumn();
    if ($cnt === 0) {
      $now = gmdate('Y-m-d\TH:i:s\Z');
      $seed = $pdo->prepare('INSERT INTO settings(key,value,updated_at) VALUES (?,?,?)');
      foreach ([['bcv_rate','203.74'],['price_per_folio_usd','1.50'],['convocatoria_usd','10.00'],['iva_percent','16']] as $row){ $seed->execute([$row[0],$row[1],$now]); }
    }
    return $pdo;
  },
  AuthService::class => function(){ return new AuthService(); },
  AuthMiddleware::class => function($c){ return new AuthMiddleware($c->get(AuthService::class)); }
  ,ErrorMiddleware::class => function(){ return new ErrorMiddleware(); }
  ,LegalRepository::class => function($c){ return new LegalRepository($c->get(PDO::class)); }
  ,LegalService::class => function($c){ return new LegalService($c->get(LegalRepository::class), $c->get(PDO::class)); }
]);
$container = $builder->build();
return $container;
