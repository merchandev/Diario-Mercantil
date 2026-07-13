<?php
require_once __DIR__."/Response.php";
require_once __DIR__."/Database.php";
require_once __DIR__."/AuthController.php";
require_once __DIR__."/Role.php";
require_once __DIR__."/RolePolicy.php";

class UserController {
  private function json(){ $raw = file_get_contents("php://input"); return json_decode($raw, true) ?: []; }
  
  private function audit(PDO $pdo, int $actorId, string $action, string $type, string $resId, ?array $before, ?array $after) {
      $ip = $_SERVER['REMOTE_ADDR'] ?? null;
      $bJson = $before ? json_encode($before) : null;
      $aJson = $after ? json_encode($after) : null;
      $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id, before_data, after_data, ip_address) VALUES(?,?,?,?,?,?,?)")
          ->execute([$actorId, $action, $type, $resId, $bJson, $aJson, $ip]);
  }

  public function list(){
    $u = AuthController::requireAuth(); 
    if ($u['role'] !== RolePolicy::ADMIN && $u['role'] !== RolePolicy::SUPERADMIN) {
        Response::json(["error"=>"forbidden", "details"=>"No autorizado"], 403);
    }
    $pdo = Database::pdo();
    $q = trim($_GET["q"] ?? "");
    $sql = "SELECT id, document, name, role, email, phone, status, person_type FROM users";
    if ($q !== "") {
      $stmt = $pdo->prepare($sql." WHERE (document LIKE ? OR name LIKE ?) ORDER BY id DESC LIMIT 500");
      $stmt->execute(["%".$q."%","%".$q."%"]);
    } else {
      $stmt = $pdo->query($sql." ORDER BY id DESC LIMIT 500");
    }
    Response::json(["items"=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
  }

  public function create(){
    try {
        $u = AuthController::requireAuth();
        $in = $this->json();
        $role = $in["role"] ?? RolePolicy::APPLICANT;
        
        if (!RolePolicy::canCreateRole($u, $role)) {
            Response::json(["error"=>"forbidden", "details"=>"No tiene permisos para crear usuarios con el rol $role."], 403);
            exit;
        }
        
        $pdo = Database::pdo();
        
        $document = trim($in["document"] ?? "");
        $name = trim($in["name"] ?? "");
        $password = (string)($in["password"] ?? "");
        
        // Extra fields
        $email = trim($in["email"] ?? null);
        $phone = trim($in["phone"] ?? null);
        $state = trim($in["state"] ?? null);
        $municipality = trim($in["municipality"] ?? null);
        $address = trim($in["address"] ?? null);
        $status = "active";
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
        
        $stmt = $pdo->prepare("
            INSERT INTO users(document, name, password_hash, role, email, phone, state, municipality, address, status, person_type, created_at, updated_at) 
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        
        $stmt->execute([$document, $name, $hash, $role, $email, $phone, $state, $municipality, $address, $status, $personType]);
        $newId = (int)$pdo->lastInsertId();
        
        $this->audit($pdo, $u['id'], 'create', 'user', $newId, null, ['document'=>$document, 'role'=>$role]);
        
        Response::json(["id"=>$newId]);

    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        Response::json(["error" => "database_error", "message" => "Ocurrió un error en la base de datos."], 500);
    } catch (Throwable $e) {
        error_log("General Error: " . $e->getMessage());
        Response::json(["error" => "server_error", "message" => "Ocurrió un error en el servidor."], 500);
    }
  }

  public function update($id){
    try {
        $u = AuthController::requireAuth();
        if ($u['id'] != $id) {
            Response::json(["error"=>"forbidden", "message"=>"Solo puede modificar su propio perfil mediante esta ruta."], 403);
            exit;
        }
        
        $pdo = Database::pdo();
        $in = $this->json();
        
        $name = trim($in["name"] ?? "");
        $email = trim($in["email"] ?? "");
        $phone = trim($in["phone"] ?? "");
        $state = trim($in["state"] ?? "");
        $municipality = trim($in["municipality"] ?? "");
        $address = trim($in["address"] ?? "");
        $password = (string)($in["password"] ?? "");
        
        $set = ["updated_at=NOW()"];
        $params = [];

        if ($name !== "") { $set[] = "name=?"; $params[] = $name; }
        if ($email !== "") { $set[] = "email=?"; $params[] = $email; }
        if ($phone !== "") { $set[] = "phone=?"; $params[] = $phone; }
        if ($state !== "") { $set[] = "state=?"; $params[] = $state; }
        if ($municipality !== "") { $set[] = "municipality=?"; $params[] = $municipality; }
        if ($address !== "") { $set[] = "address=?"; $params[] = $address; }
        
        if ($password !== "") {
            $set[] = "password_hash=?";
            $params[] = password_hash($password, PASSWORD_BCRYPT);
        }
        
        if (empty($set)) {
            Response::json(["ok"=>true]); 
        }

        $params[] = $id;
        $sql = "UPDATE users SET " . implode(", ", $set) . " WHERE id=?";
        $pdo->prepare($sql)->execute($params);
        
        Response::json(["ok"=>true]);
    } catch (Throwable $e) {
        error_log("Update error: " . $e->getMessage());
        Response::json(["error" => "server_error", "message" => "No fue posible completar la operación"], 500);
    }
  }
  
  private function getTargetUser(PDO $pdo, int $id): ?array {
      $stmt = $pdo->prepare("SELECT * FROM users WHERE id=?");
      $stmt->execute([$id]);
      return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
  }
  
  public function suspend($id) {
      try {
          $u = AuthController::requireAuth();
          $pdo = Database::pdo();
          $target = $this->getTargetUser($pdo, $id);
          
          if (!$target) { Response::json(["error"=>"not_found"], 404); exit; }
          if ($target['id'] == $u['id']) { Response::json(["error"=>"forbidden", "message"=>"No puedes suspender tu propia cuenta."], 403); exit; }
          if (!RolePolicy::canModifyUser($u, $target)) { Response::json(["error"=>"forbidden", "message"=>"No tienes jerarquía para suspender este usuario."], 403); exit; }
          
          if ($target['role'] === RolePolicy::SUPERADMIN) {
              $cnt = $pdo->query("SELECT COUNT(*) FROM users WHERE role='superadmin' AND status='active'")->fetchColumn();
              if ($cnt <= 1) {
                  Response::json(["error"=>"conflict", "message"=>"No se puede suspender al último superadministrador activo."], 409); exit;
              }
          }
          
          $pdo->beginTransaction();
          $pdo->prepare("UPDATE users SET status='suspended', updated_at=NOW() WHERE id=?")->execute([$id]);
          $pdo->prepare("UPDATE sessions SET revoked_at=NOW() WHERE user_id=?")->execute([$id]); // Revoke tokens
          $this->audit($pdo, $u['id'], 'suspend', 'user', $id, ['status'=>$target['status']], ['status'=>'suspended']);
          $pdo->commit();
          
          Response::json(["ok"=>true]);
      } catch (Throwable $e) {
          if ($pdo->inTransaction()) $pdo->rollBack();
          Response::json(["error" => "server_error"], 500);
      }
  }

  public function restore($id) {
      try {
          $u = AuthController::requireAuth();
          $pdo = Database::pdo();
          $target = $this->getTargetUser($pdo, $id);
          
          if (!$target) { Response::json(["error"=>"not_found"], 404); exit; }
          if (!RolePolicy::canModifyUser($u, $target)) { Response::json(["error"=>"forbidden"], 403); exit; }
          
          $pdo->beginTransaction();
          $pdo->prepare("UPDATE users SET status='active', updated_at=NOW() WHERE id=?")->execute([$id]);
          $this->audit($pdo, $u['id'], 'restore', 'user', $id, ['status'=>$target['status']], ['status'=>'active']);
          $pdo->commit();
          
          Response::json(["ok"=>true]);
      } catch (Throwable $e) {
          if ($pdo->inTransaction()) $pdo->rollBack();
          Response::json(["error" => "server_error"], 500);
      }
  }

  public function changeRole($id) {
      try {
          $u = AuthController::requireAuth();
          $in = $this->json();
          $newRole = $in['role'] ?? '';
          $pdo = Database::pdo();
          $target = $this->getTargetUser($pdo, $id);
          
          if (!$target) { Response::json(["error"=>"not_found"], 404); exit; }
          if (!RolePolicy::canModifyUser($u, $target)) { Response::json(["error"=>"forbidden"], 403); exit; }
          if (!RolePolicy::canCreateRole($u, $newRole)) { Response::json(["error"=>"forbidden", "message"=>"No puedes asignar este rol."], 403); exit; }
          
          $pdo->beginTransaction();
          $pdo->prepare("UPDATE users SET role=?, updated_at=NOW() WHERE id=?")->execute([$newRole, $id]);
          $this->audit($pdo, $u['id'], 'change_role', 'user', $id, ['role'=>$target['role']], ['role'=>$newRole]);
          $pdo->commit();
          
          Response::json(["ok"=>true]);
      } catch (Throwable $e) {
          if ($pdo->inTransaction()) $pdo->rollBack();
          Response::json(["error" => "server_error"], 500);
      }
  }

  public function resetPassword($id) {
      try {
          $u = AuthController::requireAuth();
          $in = $this->json();
          $newPass = $in['password'] ?? '';
          if (empty($newPass)) { Response::json(["error"=>"missing_password"], 400); exit; }
          
          $pdo = Database::pdo();
          $target = $this->getTargetUser($pdo, $id);
          
          if (!$target) { Response::json(["error"=>"not_found"], 404); exit; }
          if (!RolePolicy::canModifyUser($u, $target)) { Response::json(["error"=>"forbidden"], 403); exit; }
          
          $hash = password_hash($newPass, PASSWORD_BCRYPT);
          
          $pdo->beginTransaction();
          $pdo->prepare("UPDATE users SET password_hash=?, updated_at=NOW() WHERE id=?")->execute([$hash, $id]);
          $pdo->prepare("UPDATE sessions SET revoked_at=NOW() WHERE user_id=?")->execute([$id]); // Revoke sessions
          $this->audit($pdo, $u['id'], 'reset_password', 'user', $id, null, null);
          $pdo->commit();
          
          Response::json(["ok"=>true]);
      } catch (Throwable $e) {
          if ($pdo->inTransaction()) $pdo->rollBack();
          Response::json(["error" => "server_error"], 500);
      }
  }
  
  public function delete($id){
    try {
        $u = AuthController::requireAuth();
        $pdo = Database::pdo();
        $target = $this->getTargetUser($pdo, $id);
        
        if (!$target) { Response::json(["error"=>"not_found"], 404); exit; }
        if ($target['id'] == $u['id']) { Response::json(["error"=>"forbidden", "message"=>"No puedes eliminar tu propia cuenta."], 403); exit; }
        if (!RolePolicy::canDeleteUser($u, $target)) { Response::json(["error"=>"forbidden", "message"=>"Jerarquía insuficiente."], 403); exit; }
        
        if ($target['role'] === RolePolicy::SUPERADMIN) {
            $cnt = $pdo->query("SELECT COUNT(*) FROM users WHERE role='superadmin' AND status='active'")->fetchColumn();
            if ($cnt <= 1) {
                Response::json(["error"=>"conflict", "message"=>"No se puede eliminar al último superadministrador activo."], 409); exit;
            }
        }
        
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE users SET status='deleted', updated_at=NOW() WHERE id=?")
            ->execute([$id]);
        $pdo->prepare("UPDATE sessions SET revoked_at=NOW() WHERE user_id=?")->execute([$id]);
        $this->audit($pdo, $u['id'], 'delete', 'user', $id, null, ['status'=>'deleted']);
        $pdo->commit();
        
        Response::json(["ok"=>true]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        Response::json(["error" => "server_error"], 500);
    }
  }
  
  public function uploadAvatar() {
    try {
        $user = AuthController::requireAuth();
        $pdo = Database::pdo();
        
        if ($user['role'] !== RolePolicy::ADMIN && $user['role'] !== RolePolicy::SUPERADMIN) {
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
                        exit;
                    }
                } catch (Exception $e) {}
            }
        }

        if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
            Response::json(["error"=>"No se subió ninguna imagen o hubo un error en la subida.", "sys_err" => $_FILES['avatar']['error'] ?? 'missing'], 400);
            exit;
        }
        
        $file = $_FILES['avatar'];
        if ($file['size'] > 10 * 1024 * 1024) {
            Response::json(["error"=>"La imagen debe ser menor a 10MB."], 400);
            exit;
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
            exit;
        }
        
        $baseUploadDir = realpath(__DIR__.'/..').'/storage/avatars';
        if (!is_dir($baseUploadDir)) mkdir($baseUploadDir, 0750, true);
        
        $ext = $allowedMimes[$mime];
        
        $uniqueName = 'avatar_' . $user['id'] . '_' . time() . '.' . $ext;
        $dest = $baseUploadDir . '/' . $uniqueName;
        
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            Response::json(["error"=>"Error al guardar la imagen en el servidor."], 500);
            exit;
        }
        
        $publicUrl = '/api/uploads/avatars/' . $uniqueName;
        
        $update = $pdo->prepare("UPDATE users SET avatar_url=?, avatar_updated_at=NOW() WHERE id=?");
        $update->execute([$publicUrl, $user['id']]);
        
        Response::json(["ok"=>true, "avatar_url"=>$publicUrl]);
    } catch (Throwable $e) {
        error_log("Avatar upload error: " . $e->getMessage());
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(["error" => "server_error", "message" => "No fue posible completar la operación"]);
        exit;
    }
  }
}
