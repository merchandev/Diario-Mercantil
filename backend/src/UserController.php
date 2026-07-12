<?php
require_once __DIR__."/Response.php";
require_once __DIR__."/Database.php";
require_once __DIR__."/AuthController.php";

class UserController {
  private function json(){ $raw = file_get_contents("php://input"); return json_decode($raw, true) ?: []; }

  public function list(){
    $u = AuthController::requireAuth(); 
    if ($u['role'] !== 'admin' && $u['role'] !== 'superadmin') {
        Response::json(["error"=>"forbidden", "details"=>"No autorizado"], 403);
    }
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
        $u = AuthController::requireAuth();
        if ($u['role'] !== 'admin' && $u['role'] !== 'superadmin') {
            Response::json(["error"=>"forbidden", "details"=>"Only admins can create users manually."], 403);
        }
        
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
    $u = AuthController::requireAuth();
    if ($u['role'] !== 'admin' && $u['role'] !== 'superadmin' && $u['id'] != $id) {
        Response::json(["error"=>"forbidden", "details"=>"You can only edit your own profile."], 403);
    }
    
    $pdo = Database::pdo();
    $in = $this->json();
    
    $name = trim($in["name"] ?? "");
    
    if ($u['role'] === 'admin' || $u['role'] === 'superadmin') {
        $role = $in["role"] ?? "";
        $status = $in["status"] ?? "";
    } else {
        $role = "";
        $status = "";
    }
    
    $email = trim($in["email"] ?? "");
    $phone = trim($in["phone"] ?? "");
    $state = trim($in["state"] ?? "");
    $municipality = trim($in["municipality"] ?? "");
    $address = trim($in["address"] ?? "");
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
    $u = AuthController::requireAuth();
    if ($u['role'] !== 'admin' && $u['role'] !== 'superadmin') {
        Response::json(["error"=>"forbidden"], 403);
    }
    
    $pdo = Database::pdo();
    $pdo->prepare("DELETE FROM users WHERE id=?")->execute([$id]);
    Response::json(["ok"=>true]);
  }
  
  public function uploadAvatar() {
    try {
        $user = AuthController::requireAuth();
        $pdo = Database::pdo();
        
        // Check constraint: Can only change every 3 months (admins are exempt)
        if ($user['role'] !== 'admin') {
            $stmt = $pdo->prepare("SELECT avatar_updated_at FROM users WHERE id=?");
            $stmt->execute([$user['id']]);
            $lastUpdate = $stmt->fetchColumn();
            
            if (!empty($lastUpdate) && $lastUpdate !== '0000-00-00 00:00:00') {
                try {
                    $lastDate = new DateTime($lastUpdate);
                    $now = new DateTime();
                    $diff = $now->diff($lastDate);
                    if ($diff->y == 0 && $diff->m < 3) {
                        Response::json(["error"=>"Solo puedes cambiar tu foto de perfil una vez cada 3 meses."], 403);
                    }
                } catch (Exception $e) {
                    // Ignore parsing errors, assume allowed
                }
            }
        }

        if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
            Response::json(["error"=>"No se subió ninguna imagen o hubo un error en la subida.", "sys_err" => $_FILES['avatar']['error'] ?? 'missing'], 400);
        }
        
        $file = $_FILES['avatar'];
        if ($file['size'] > 10 * 1024 * 1024) {
            Response::json(["error"=>"La imagen debe ser menor a 10MB."], 400);
        }
        
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $allowedMimes = [
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/gif'  => 'gif',
            'image/webp' => 'webp'
        ];
        
        if (!array_key_exists($mime, $allowedMimes)) {
            Response::json(["error"=>"Archivo inválido. Solo se permiten imágenes válidas (JPG, PNG, GIF, WEBP)."], 400);
        }
        
        $baseUploadDir = realpath(__DIR__.'/..').'/storage/avatars';
        if (!is_dir($baseUploadDir)) mkdir($baseUploadDir, 0777, true);
        
        $ext = $allowedMimes[$mime];
        
        $uniqueName = 'avatar_' . $user['id'] . '_' . time() . '.' . $ext;
        $dest = $baseUploadDir . '/' . $uniqueName;
        
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            Response::json(["error"=>"Error al guardar la imagen en el servidor."], 500);
        }
        
        $publicUrl = '/api/uploads/avatars/' . $uniqueName;
        
        $update = $pdo->prepare("UPDATE users SET avatar_url=?, avatar_updated_at=NOW() WHERE id=?");
        $update->execute([$publicUrl, $user['id']]);
        
        Response::json(["ok"=>true, "avatar_url"=>$publicUrl]);
    } catch (Throwable $e) {
        // Expose error msg specifically here
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(["error" => "server_error", "message" => $e->getMessage(), "trace" => $e->getTraceAsString()]);
        exit;
    }
  }
}
