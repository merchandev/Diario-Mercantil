<?php
require_once __DIR__."/Response.php";
require_once __DIR__."/Database.php";
require_once __DIR__."/AuthController.php";

class UserController {
  private function json(){ $raw = file_get_contents("php://input"); return json_decode($raw, true) ?: []; }

  public function list(){
    AuthController::requireAuth(); 
    $pdo = Database::pdo();
    $q = trim($_GET["q"] ?? "");
    $sql = "SELECT id, document, name, role, email, phone, status, person_type FROM users";
    if ($q !== "") {
      $stmt = $pdo->prepare($sql." WHERE document LIKE ? OR name LIKE ? ORDER BY id DESC LIMIT 500");
      $stmt->execute(["%".$q."%","%".$q."%"]);
    } else {
      $stmt = $pdo->query($sql." ORDER BY id DESC LIMIT 500");
    }
    Response::json(["items"=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
  }

  public function create(){
    try {
        $pdo = Database::pdo();
        $in = $this->json();
        
        $document = trim($in["document"] ?? "");
        $name = trim($in["name"] ?? "");
        $password = (string)($in["password"] ?? "");
        $role = $in["role"] ?? "solicitante";
        
        // Extra fields
        $email = trim($in["email"] ?? null);
        $phone = trim($in["phone"] ?? null);
        $status = $in["status"] ?? "active";
        $personType = $in["person_type"] ?? "natural";

        if ($document==="" || $name==="" || $password==="") {
            Response::json(["error"=>"missing_fields"], 400);
        }

        // Check if exists
        $exists = $pdo->prepare("SELECT 1 FROM users WHERE document=?");
        $exists->execute([$document]);
        if ($exists->fetchColumn()) {
            Response::json(["error"=>"document_exists"], 409);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        
        // Insert with all fields
        $stmt = $pdo->prepare("
            INSERT INTO users(document, name, password_hash, role, email, phone, status, person_type, created_at, updated_at) 
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        
        $stmt->execute([$document, $name, $hash, $role, $email, $phone, $status, $personType]);
        
        Response::json(["id"=>(int)$pdo->lastInsertId()]);

    } catch (PDOException $e) {
        error_log("Database Error in UserController::create: " . $e->getMessage());
        Response::json(["error" => "database_error", "details" => $e->getMessage()], 500);
    } catch (Throwable $e) {
        error_log("General Error in UserController::create: " . $e->getMessage());
        Response::json(["error" => "server_error", "details" => $e->getMessage()], 500);
    }
    }

  public function update($id){
    AuthController::requireAuth();
    $pdo = Database::pdo();
    $in = $this->json();
    
    $name = trim($in["name"] ?? "");
    $role = $in["role"] ?? "solicitante";
    $email = trim($in["email"] ?? "");
    $status = trim($in["status"] ?? "");
    $password = (string)($in["password"] ?? "");
    
    // Prepare update query dynamically
    $fields = ["name=?", "role=?, updated_at=NOW()"];
    $params = [$name, $role];
    
    if ($email !== "") {
        // Optional: Check for duplicate email if strictly enforced
        $fields[] = "email=?";
        $params[] = $email;
    }
    
    if ($status === 'active' || $status === 'suspended') {
        $fields[] = "status=?";
        $params[] = $status;
    }
    
    if ($password !== "") {
        $fields[] = "password_hash=?";
        $params[] = password_hash($password, PASSWORD_BCRYPT);
    }
    
    $params[] = $id;
    $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id=?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    Response::json(["ok"=>true]);
  }
  
  public function delete($id){
    AuthController::requireAuth();
    $pdo = Database::pdo();
    $pdo->prepare("DELETE FROM users WHERE id=?")->execute([$id]);
    Response::json(["ok"=>true]);
  }
}
