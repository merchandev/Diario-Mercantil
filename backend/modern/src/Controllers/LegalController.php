<?php
namespace App\Controllers;
use App\Core\Response;
use App\Services\LegalService;

final class LegalController {
  public function __construct(private LegalService $service){}

  private function auth(): array { return $GLOBALS['auth_payload'] ?? []; }

  public function list(): void {
    $filters = [ 'status'=> $_GET['status'] ?? '', 'q' => $_GET['q'] ?? '' ];
    $items = $this->service->list($filters, $this->auth());
    Response::json(['items'=>$items]);
  }

  public function get(array $vars): void {
    $id = (int)($vars['id'] ?? 0);
    $row = $this->service->get($id, $this->auth());
    if (!$row) { Response::json(['error'=>'No encontrado'],404); return; }
    Response::json(['item'=>$row]);
  }

  public function create(): void {
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $id = $this->service->create($in, $this->auth());
    Response::json(['ok'=>true,'id'=>$id],201);
  }

  public function reject(array $vars): void {
    $id = (int)($vars['id'] ?? 0);
    if ($this->service->reject($id,$this->auth())) { Response::json(['ok'=>true]); return; }
    Response::json(['error'=>'Operación no permitida'],403);
  }

  public function addPayment(array $vars): void {
    $id = (int)($vars['id'] ?? 0);
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $p = $this->service->addPayment($id,$this->auth(),[
      'type'=>$in['type'] ?? 'transferencia',
      'bank'=>$in['bank'] ?? '',
      'ref'=>$in['ref'] ?? '',
      'date'=>$in['date'] ?? date('Y-m-d'),
      'amount_bs'=>$in['amount_bs'] ?? 0
    ]);
    if (!$p) { Response::json(['error'=>'No permitido'],403); return; }
    Response::json(['payment'=>$p]);
  }

  public function deletePayment(array $vars): void {
    $id = (int)($vars['id'] ?? 0); $pid = (int)($vars['pid'] ?? 0);
    if ($this->service->deletePayment($id,$pid,$this->auth())) { Response::json(['ok'=>true]); return; }
    Response::json(['error'=>'No permitido'],403);
  }

  public function uploadPdf(): void {
    if (!isset($_FILES['file'])) { Response::json(['error'=>'Archivo requerido'],400); return; }
    $out = $this->service->uploadPdf($this->auth(), $_FILES['file']);
    Response::json(['ok'=>true] + $out,201);
  }
}
