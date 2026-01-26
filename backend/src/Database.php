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
        
        // Retry logic for database connection (useful during container startup)
        $maxRetries = 5;
        $retryDelay = 2; // seconds
        $lastException = null;
        
        for ($i = 0; $i < $maxRetries; $i++) {
          try {
            self::$pdo = new PDO($dsn, $user, $pass, [
              PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
              PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
              PDO::ATTR_EMULATE_PREPARES => false,
              PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ]);
            
            // Connection successful, break retry loop
            error_log("Database connection established successfully");
            break;
            
          } catch (PDOException $e) {
            $lastException = $e;
            error_log("Database connection attempt " . ($i + 1) . "/$maxRetries failed: " . $e->getMessage());
            
            if ($i < $maxRetries - 1) {
              sleep($retryDelay);
            }
          }
        }
        
        // If we exhausted all retries, throw detailed error
        if (!self::$pdo && $lastException) {
          $errorMsg = "DB Connection failed after $maxRetries attempts. ";
          $errorMsg .= "Host: $host:$port, Database: $db, User: $user. ";
          $errorMsg .= "Error: " . $lastException->getMessage();
          
          // Log full error server-side
          error_log($errorMsg);
          
          // Throw sanitized error for client
          throw new Exception("Database connection failed. Please check server configuration.");
        }
        
      } else {
        // SQLite fallback
        $dbPath = getenv("DB_PATH") ?: __DIR__."/../storage/database.sqlite";
        
        // Ensure directory exists
        $dir = dirname($dbPath);
        if (!is_dir($dir)) {
          mkdir($dir, 0775, true);
        }
        
        // Create file if doesn't exist
        if (!file_exists($dbPath)) {
          touch($dbPath);
          chmod($dbPath, 0664);
        }
        
        try {
          self::$pdo = new PDO("sqlite:$dbPath");
          self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
          self::$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
          
          // Enable foreign keys for SQLite
          self::$pdo->exec("PRAGMA foreign_keys = ON");
          
        } catch (PDOException $e) {
          error_log("SQLite connection failed: " . $e->getMessage());
          throw new Exception("Database initialization failed");
        }
      }
    }
    
    return self::$pdo;
  }
  
  /**
   * Test database connection health
   */
  public static function healthCheck(): bool {
    try {
      $pdo = self::pdo();
      $pdo->query("SELECT 1");
      return true;
    } catch (Throwable $e) {
      error_log("Database health check failed: " . $e->getMessage());
      return false;
    }
  }
}
