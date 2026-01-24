<?php
class Database {
  private static ?PDO $pdo = null;
  public static function pdo(): PDO {
    if (!self::$pdo) {
      $connection = getenv("DB_CONNECTION") ?: "sqlite";
      if ($connection === "mysql") {
        $host = getenv("DB_HOST") ?: "db";
        $port = getenv("DB_PORT") ?: "3306";
        $db   = getenv("DB_DATABASE") ?: "diario_mercantil";
        $user = getenv("DB_USERNAME") ?: "mercantil_user";
        $pass = getenv("DB_PASSWORD") ?: "secure_password_2025";
        $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
        try { self::$pdo = new PDO($dsn, $user, $pass); } 
        catch (PDOException $e) { throw new Exception("DB Connection failed: " . $e->getMessage()); }
      } else {
        $dbPath = getenv("DB_PATH") ?: __DIR__."/../storage/database.sqlite";
        self::$pdo = new PDO("sqlite:".$dbPath);
      }
      self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
      self::$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }
    return self::$pdo;
  }
}
