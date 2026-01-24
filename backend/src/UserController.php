<?php
require_once __DIR__."/Response.php";
require_once __DIR__."/Database.php";
require_once __DIR__."/AuthController.php";

class UserController {
  private function json(){
    $raw = file_get_contents("php://input");
    return json_decode($raw, true) ?: [];
  }

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
    AuthController::requireAuth();
    $pdo = Database::pdo();
    $in = $this->json();
    $document = trim($in["document"] ?? "");
    $name = trim($in["name"] ?? "");
    $password = (string)($in["password"] ?? "");
    $role = $in["role"] ?? "solicitante";
    
    if ($document==="" || $name==="" || $password==="") Response::json(["error"=>"missing_fields"],400);
    
    $exists = $pdo->prepare("SELECT 1 FROM users WHERE document=?");
    $exists->execute([$document]);
    if ($exists->fetchColumn()) Response::json(["error"=>"document_exists"],409);
    
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("INSERT INTO users(document,name,password_hash,role,created_at,updated_at) VALUES(?,?,?,?,NOW(),NOW())");
    $stmt->execute([$document,$name,$hash,$role]);
    Response::json(["id"=>(int)$pdo->lastInsertId()]);
  }

  public function update($id){
    AuthController::requireAuth();
    $pdo = Database::pdo();
    $in = $this->json();
    $name = trim($in["name"] ?? "");
    $role = $in["role"] ?? "solicitante";
    $stmt = $pdo->prepare("UPDATE users SET name=?, role=?, updated_at=NOW() WHERE id=?");
    $stmt->execute([$name,$role,$id]);
    Response::json(["ok"=>true]);
  }
  
  public function delete($id){
    AuthController::requireAuth();
    $pdo = Database::pdo();
    $pdo->prepare("DELETE FROM users WHERE id=?")->execute([$id]);
    Response::json(["ok"=>true]);
  }
}
