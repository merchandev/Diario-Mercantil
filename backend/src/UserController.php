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
        $state = trim($in["state"] ?? null);
        $municipality = trim($in["municipality"] ?? null);
        $address = trim($in["address"] ?? null);
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
            INSERT INTO users(document, name, password_hash, role, email, phone, state, municipality, address, status, person_type, created_at, updated_at) 
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        
        $stmt->execute([$document, $name, $hash, $role, $email, $phone, $state, $municipality, $address, $status, $personType]);
        
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
    $role = $in["role"] ?? "";
    $email = trim($in["email"] ?? "");
    $phone = trim($in["phone"] ?? "");
    $state = trim($in["state"] ?? "");
    $municipality = trim($in["municipality"] ?? "");
    $address = trim($in["address"] ?? "");
    $status = $in["status"] ?? "";
    $password = (string)($in["password"] ?? "");
    
    $set = ["updated_at=NOW()"];
    $params = [];

    if ($name !== "") { $set[] = "name=?"; $params[] = $name; }
    if ($role !== "") { $set[] = "role=?"; $params[] = $role; }
    if ($email !== "") { $set[] = "email=?"; $params[] = $email; }
    if ($phone !== "") { $set[] = "phone=?"; $params[] = $phone; }
    if ($state !== "") { $set[] = "state=?"; $params[] = $state; }
    if ($municipality !== "") { $set[] = "municipality=?"; $params[] = $municipality; }
    if ($address !== "") { $set[] = "address=?"; $params[] = $address; } // Allow clearing address? If strictly update if present. 
    // For simplicity, we update if strictly provided in JSON. If user sends empty string, it updates to empty string.
    
    if ($status === 'active' || $status === 'suspended') {
        $set[] = "status=?";
        $params[] = $status;
    }
    
    if ($password !== "") {
        $set[] = "password_hash=?";
        $params[] = password_hash($password, PASSWORD_BCRYPT);
    }
    
    if (empty($set)) {
        Response::json(["ok"=>true]); // Nothing to update
    }

    $params[] = $id;
    $sql = "UPDATE users SET " . implode(", ", $set) . " WHERE id=?";
    
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
