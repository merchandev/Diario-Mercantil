<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';
require_once __DIR__.'/AuthController.php';

class DirectoryController {
  private function currentUser(){ return AuthController::userFromToken(AuthController::bearerToken()); }

  public function getProfile(){
    $pdo = Database::pdo();
    $u = $this->currentUser(); if(!$u) return Response::json(['error'=>'unauthorized'],401);
    $s = $pdo->prepare('SELECT * FROM directory_profiles WHERE user_id=?');
    $s->execute([(int)$u['id']]);
    $row = $s->fetch(PDO::FETCH_ASSOC);
    Response::json(['profile'=>$row]);
  }

  public function saveProfile(){
    $pdo = Database::pdo();
    $u = $this->currentUser(); if(!$u) return Response::json(['error'=>'unauthorized'],401);
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $now = gmdate('c');
    $s = $pdo->prepare('SELECT * FROM directory_profiles WHERE user_id=?');
    $s->execute([(int)$u['id']]); $row = $s->fetch(PDO::FETCH_ASSOC);
    $fields = ['full_name','email','phones','state','areas','colegio','socials'];
    if ($row && ($row['status'] ?? '') === 'aprobado') {
      // After approval, lock personal/professional data except profile photo
      $fields = ['socials'];
    }
    if ($row) {
      $set=[];$vals=[]; foreach($fields as $f){ if(array_key_exists($f,$in)){ $set[]="$f=?"; $vals[]=$in[$f]; }}
      $set[]='updated_at=?'; $vals[]=$now; $vals[]=(int)$u['id'];
      $pdo->prepare('UPDATE directory_profiles SET '.implode(',',$set).' WHERE user_id=?')->execute($vals);
    } else {
      $profile = [
        'user_id'=>(int)$u['id'],
        'full_name'=>$in['full_name'] ?? $u['name'],
        'email'=>$in['email'] ?? null,
        'phones'=>$in['phones'] ?? null,
        'state'=>$in['state'] ?? null,
        'areas'=>$in['areas'] ?? null,
        'colegio'=>$in['colegio'] ?? null,
        'socials'=>$in['socials'] ?? null,
        'status'=>'pendiente',
        'created_at'=>$now,
        'updated_at'=>$now
      ];
      $pdo->prepare('INSERT INTO directory_profiles(user_id,full_name,email,phones,state,areas,colegio,socials,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
          ->execute(array_values($profile));
    }
    Response::json(['ok'=>true]);
  }

  public function setPhoto(){
    $pdo = Database::pdo(); $u = $this->currentUser(); if(!$u) return Response::json(['error'=>'unauthorized'],401);
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $file_id = (int)($in['file_id'] ?? 0); $kind = $in['kind'] ?? 'profile';
    if(!$file_id) return Response::json(['error'=>'file_id_required'],400);
    // Check approval status to prevent editing INPRE after approval
    $s = $pdo->prepare('SELECT status FROM directory_profiles WHERE user_id=?');
    $s->execute([(int)$u['id']]); $status = $s->fetchColumn() ?: 'pendiente';
    if ($kind==='inpre' && $status==='aprobado') {
      return Response::json(['error'=>'inpre_photo_locked_after_approval'], 400);
    }
    $col = $kind==='inpre' ? 'inpre_photo_file_id' : 'profile_photo_file_id';
    $now = gmdate('c');
    $pdo->prepare("INSERT INTO directory_profiles(user_id,$col,created_at,updated_at,full_name) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET $col=excluded.$col, updated_at=excluded.updated_at")
        ->execute([(int)$u['id'],$file_id,$now,$now,$u['name']]);
    Response::json(['ok'=>true]);
  }

    // Admin-only: Areas
    public function listAreas(){
      $u = $this->currentUser(); if (!$u || ($u['role']??'')!=='admin') return Response::json(['error'=>'forbidden'],403);
      $pdo = Database::pdo();
      $rows = $pdo->query('SELECT id, name FROM directory_areas ORDER BY name')->fetchAll(PDO::FETCH_ASSOC);
      Response::json(['items'=>$rows]);
    }
    public function createArea(){
      $u = $this->currentUser(); if (!$u || ($u['role']??'')!=='admin') return Response::json(['error'=>'forbidden'],403);
      $pdo = Database::pdo();
      $in = json_decode(file_get_contents('php://input'), true) ?: [];
      $name = trim((string)($in['name'] ?? ''));
      if ($name==='') return Response::json(['error'=>'name_required'],400);
      $now = gmdate('c');
      $stmt = $pdo->prepare('INSERT INTO directory_areas(name,created_at,updated_at) VALUES(?,?,?)');
      $stmt->execute([$name,$now,$now]);
      Response::json(['id'=>(int)$pdo->lastInsertId()]);
    }
    public function updateArea($id){
      $u = $this->currentUser(); if (!$u || ($u['role']??'')!=='admin') return Response::json(['error'=>'forbidden'],403);
      $pdo = Database::pdo();
      $in = json_decode(file_get_contents('php://input'), true) ?: [];
      $name = trim((string)($in['name'] ?? ''));
      if ($name==='') return Response::json(['error'=>'name_required'],400);
      $now = gmdate('c');
      $stmt = $pdo->prepare('UPDATE directory_areas SET name=?, updated_at=? WHERE id=?');
      $stmt->execute([$name,$now,(int)$id]);
      Response::json(['ok'=>true]);
    }
    public function deleteArea($id){
      $u = $this->currentUser(); if (!$u || ($u['role']??'')!=='admin') return Response::json(['error'=>'forbidden'],403);
      $pdo = Database::pdo();
      $stmt = $pdo->prepare('DELETE FROM directory_areas WHERE id=?');
      $stmt->execute([(int)$id]);
      Response::json(['ok'=>true]);
    }

    // Admin-only: Colleges
    public function listColleges(){
      $u = $this->currentUser(); if (!$u || ($u['role']??'')!=='admin') return Response::json(['error'=>'forbidden'],403);
      $pdo = Database::pdo();
      $rows = $pdo->query('SELECT id, name FROM directory_colleges ORDER BY name')->fetchAll(PDO::FETCH_ASSOC);
      Response::json(['items'=>$rows]);
    }
    public function createCollege(){
      $u = $this->currentUser(); if (!$u || ($u['role']??'')!=='admin') return Response::json(['error'=>'forbidden'],403);
      $pdo = Database::pdo();
      $in = json_decode(file_get_contents('php://input'), true) ?: [];
      $name = trim((string)($in['name'] ?? ''));
      if ($name==='') return Response::json(['error'=>'name_required'],400);
      $now = gmdate('c');
      $stmt = $pdo->prepare('INSERT INTO directory_colleges(name,created_at,updated_at) VALUES(?,?,?)');
      $stmt->execute([$name,$now,$now]);
      Response::json(['id'=>(int)$pdo->lastInsertId()]);
    }
    public function updateCollege($id){
      $u = $this->currentUser(); if (!$u || ($u['role']??'')!=='admin') return Response::json(['error'=>'forbidden'],403);
      $pdo = Database::pdo();
      $in = json_decode(file_get_contents('php://input'), true) ?: [];
      $name = trim((string)($in['name'] ?? ''));
      if ($name==='') return Response::json(['error'=>'name_required'],400);
      $now = gmdate('c');
      $stmt = $pdo->prepare('UPDATE directory_colleges SET name=?, updated_at=? WHERE id=?');
      $stmt->execute([$name,$now,(int)$id]);
      Response::json(['ok'=>true]);
    }
    public function deleteCollege($id){
      $u = $this->currentUser(); if (!$u || ($u['role']??'')!=='admin') return Response::json(['error'=>'forbidden'],403);
      $pdo = Database::pdo();
      $stmt = $pdo->prepare('DELETE FROM directory_colleges WHERE id=?');
      $stmt->execute([(int)$id]);
      Response::json(['ok'=>true]);
    }
}
