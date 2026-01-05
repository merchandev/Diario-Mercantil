<?php
namespace App\Services;

use App\Repositories\LegalRepository;
use PDO;

final class LegalService {
  public function __construct(private LegalRepository $repo, private PDO $pdo){}

  private function isStaff(string $role): bool {
    return in_array($role, ['admin','administrador','superadmin','editor','gestor','manager']);
  }

  public function list(array $filters, array $auth): array {
    $userId = (int)($auth['sub'] ?? 0);
    $rows = $this->repo->list($filters, $this->isStaff($auth['role'] ?? ''), $userId);
    return array_map(function($r){
      $r['pricing'] = $this->pricingFromMeta($r['meta'] ?? '{}');
      return $r;
    }, $rows);
  }

  public function get(int $id, array $auth): ?array {
    $row = $this->repo->find($id); if (!$row) return null;
    $userId = (int)($auth['sub'] ?? 0);
    if (!$this->isStaff($auth['role'] ?? '') && (int)$row['user_id'] !== $userId) return null;
    $row['payments'] = $this->repo->listPayments($id);
    $row['pricing'] = $this->pricingFromMeta($row['meta'] ?? '{}');
    return $row;
  }

  public function create(array $in, array $auth): int {
    $userId = (int)($auth['sub'] ?? 0);
    $data = [
      'user_id' => $userId,
      'status' => 'Por verificar',
      'name' => trim($in['name'] ?? ''),
      'document' => trim($in['document'] ?? ''),
      'pub_type' => $in['pub_type'] ?? 'Documento',
      'meta' => json_encode($in['meta'] ?? []),
      'date' => date('Y-m-d')
    ];
    return $this->repo->insert($data);
  }

  public function reject(int $id, array $auth): bool {
    $row = $this->repo->find($id); if (!$row) return false;
    if (!$this->isStaff($auth['role'] ?? '')) return false;
    $this->repo->updateStatus($id,'Rechazado');
    return true;
  }

  public function addPayment(int $id, array $auth, array $p): ?array {
    $row = $this->repo->find($id); if (!$row) return null;
    $userId = (int)($auth['sub'] ?? 0);
    if ((int)$row['user_id'] !== $userId && !$this->isStaff($auth['role'] ?? '')) return null;
    $pid = $this->repo->addPayment($id,$p);
    return ['id'=>$pid] + $p;
  }

  public function deletePayment(int $id, int $paymentId, array $auth): bool {
    $row = $this->repo->find($id); if (!$row) return false;
    $userId = (int)($auth['sub'] ?? 0);
    if ((int)$row['user_id'] !== $userId && !$this->isStaff($auth['role'] ?? '')) return false;
    $this->repo->deletePayment($id,$paymentId); return true;
  }

  public function uploadPdf(array $auth, array $file): array {
    $userId = (int)($auth['sub'] ?? 0);
    if (!isset($file['tmp_name']) || !is_file($file['tmp_name'])) throw new \RuntimeException('Archivo inválido');
    $uploads = dirname(__DIR__,3).'/storage/uploads';
    if (!is_dir($uploads)) mkdir($uploads,0777,true);
    $name = uniqid('pdf_').'.pdf'; $dest = $uploads.'/'.$name;
    move_uploaded_file($file['tmp_name'],$dest);
    $folios = $this->countPdfPages($dest);
    $pricing = $this->computePricing($folios);
    $id = $this->repo->insert([
      'user_id'=>$userId,
      'status'=>'Por verificar',
      'name'=>$file['name'] ?? 'Documento PDF',
      'document'=>'',
      'pub_type'=>'Documento',
      'meta'=>json_encode(['file'=>$name,'folios'=>$folios,'pricing'=>$pricing]),
      'date'=>date('Y-m-d')
    ]);
    return ['id'=>$id,'folios'=>$folios,'pricing'=>$pricing];
  }

  private function countPdfPages(string $path): int {
    $c = file_get_contents($path);
    preg_match_all('/\/Type\s*\/Page[\s>]/',$c,$m);
    return max(1,count($m[0]));
  }

  private function computePricing(int $folios): array {
    $stmt = $this->pdo->query('SELECT value FROM settings WHERE key="price_per_folio_usd"');
    $pricePerFolio = (float)($stmt->fetchColumn() ?: 1.5);
    $usdSubtotal = $pricePerFolio * $folios;
    $ivaPercent = 16;
    $usdIva = $usdSubtotal * $ivaPercent / 100;
    // BCV rate
    $stmt2 = $this->pdo->query('SELECT value FROM settings WHERE key="bcv_rate"');
    $rate = (float)($stmt2->fetchColumn() ?: 40.0);
    $subtotalBs = $usdSubtotal * $rate;
    $ivaBs = $usdIva * $rate;
    return [
      'price_per_folio_usd'=>$pricePerFolio,
      'folios'=>$folios,
      'bcv_rate'=>$rate,
      'iva_percent'=>$ivaPercent,
      'unit_bs'=>$pricePerFolio * $rate,
      'subtotal_bs'=>$subtotalBs,
      'iva_bs'=>$ivaBs,
      'total_bs'=>$subtotalBs + $ivaBs
    ];
  }

  private function pricingFromMeta(string $metaJson): array {
    $meta = json_decode($metaJson,true) ?: [];
    return $meta['pricing'] ?? [];
  }
}
