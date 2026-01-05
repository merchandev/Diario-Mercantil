<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';

class UserController {
  private function json(){
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
  }

  public function list(){
    $pdo = Database::pdo();
    $q = trim($_GET['q'] ?? '');
    $sql = 'SELECT id, document, name, role, email, phone, status, person_type FROM users';
    if ($q !== '') {
      $stmt = $pdo->prepare($sql.' WHERE document LIKE ? OR name LIKE ? ORDER BY id DESC LIMIT 500');
      $stmt->execute(['%'.$q.'%','%'.$q.'%']);
    } else {
      $stmt = $pdo->query($sql.' ORDER BY id DESC LIMIT 500');
    }
    Response::json(['items'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
  }

  public function create(){
    $pdo = Database::pdo();
    $in = $this->json();
    $document = trim($in['document'] ?? '');
    $name = trim($in['name'] ?? '');
    $password = (string)($in['password'] ?? '');
    // Default applicants to role "solicitante" to align with UI and permissions
    $role = $in['role'] ?? 'solicitante';
    $email = trim($in['email'] ?? '');
    $phone = trim($in['phone'] ?? '');
    $status = $in['status'] ?? 'active';
    $person = $in['person_type'] ?? 'natural';
    if ($document==='' || $name==='' || $password==='') Response::json(['error'=>'missing_fields'],400);
    $exists = $pdo->prepare('SELECT 1 FROM users WHERE document=?');
    $exists->execute([$document]);
    if ($exists->fetchColumn()) Response::json(['error'=>'document_exists'],409);
    $now = gmdate('c');
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare('INSERT INTO users(document,name,password_hash,role,email,phone,status,person_type,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)');
    $stmt->execute([$document,$name,$hash,$role,$email,$phone,$status,$person,$now,$now]);
    Response::json(['id'=>(int)$pdo->lastInsertId()]);
  }

  public function update($id){
    $pdo = Database::pdo();
    $in = $this->json();
    $name = trim($in['name'] ?? '');
    // Keep provided role or fallback to solicitante
    $role = $in['role'] ?? 'solicitante';
    $email = trim($in['email'] ?? '');
    $phone = trim($in['phone'] ?? '');
    $status = $in['status'] ?? 'active';
    $person = $in['person_type'] ?? 'natural';
    $now = gmdate('c');
    $stmt = $pdo->prepare('UPDATE users SET name=?, role=?, email=?, phone=?, status=?, person_type=?, updated_at=? WHERE id=?');
    $stmt->execute([$name,$role,$email,$phone,$status,$person,$now,$id]);
    Response::json(['ok'=>true]);
  }

  public function setPassword($id){
    $pdo = Database::pdo();
    $in = $this->json();
    $password = (string)($in['password'] ?? '');
    if ($password==='') Response::json(['error'=>'password_required'],400);
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $pdo->prepare('UPDATE users SET password_hash=?, updated_at=? WHERE id=?')->execute([$hash,gmdate('c'),$id]);
    Response::json(['ok'=>true]);
  }

  public function delete($id){
    $pdo = Database::pdo();
    $pdo->prepare('DELETE FROM users WHERE id=?')->execute([$id]);
    Response::json(['ok'=>true]);
  }

  public function updateProfile(){
    require_once __DIR__.'/AuthController.php';
    $u = AuthController::requireAuth();
    $pdo = Database::pdo();
    $in = $this->json();
    
    $name = isset($in['name']) ? trim($in['name']) : null;
    $phone = isset($in['phone']) ? trim($in['phone']) : null;
    $email = isset($in['email']) ? trim($in['email']) : null;
    
    if (!$name) {
      Response::json(['error'=>'name_required'],400);
    }
    
    $stmt = $pdo->prepare('UPDATE users SET name = ?, phone = ?, email = ?, updated_at = ? WHERE id = ?');
    $stmt->execute([$name, $phone, $email, gmdate('c'), $u['id']]);
    
    Response::json(['ok'=>true]);
  }

  public function uploadAvatar(){
    require_once __DIR__.'/AuthController.php';
    $u = AuthController::requireAuth();
    $pdo = Database::pdo();
    
    if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
      Response::json(['error'=>'no_file_uploaded'],400);
    }
    
    $file = $_FILES['avatar'];
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!in_array($file['type'], $allowedTypes)) {
      Response::json(['error'=>'invalid_file_type'],400);
    }
    
    if ($file['size'] > 2 * 1024 * 1024) { // 2MB
      Response::json(['error'=>'file_too_large'],400);
    }
    
    // Create avatars directory if it doesn't exist
    $avatarDir = __DIR__.'/../storage/avatars';
    if (!is_dir($avatarDir)) {
      mkdir($avatarDir, 0755, true);
    }
    
    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'avatar_'.$u['id'].'_'.time().'.'.$extension;
    $filepath = $avatarDir.'/'.$filename;
    
    // Delete old avatar if exists
    $oldAvatar = $pdo->prepare('SELECT avatar_url FROM users WHERE id = ?');
    $oldAvatar->execute([$u['id']]);
    $old = $oldAvatar->fetchColumn();
    if ($old && file_exists(__DIR__.'/../storage/avatars/'.basename($old))) {
      unlink(__DIR__.'/../storage/avatars/'.basename($old));
    }
    
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
      Response::json(['error'=>'upload_failed'],500);
    }
    
    // Save URL to database
    $avatarUrl = '/storage/avatars/'.$filename;
    $pdo->prepare('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?')
        ->execute([$avatarUrl, gmdate('c'), $u['id']]);
    
    Response::json(['ok'=>true, 'avatar_url'=>$avatarUrl]);
  }
}
