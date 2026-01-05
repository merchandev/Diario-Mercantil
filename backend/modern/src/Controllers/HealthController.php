<?php
namespace App\Controllers;
use App\Core\Response;

final class HealthController {
  public function ping(): void { Response::json(['ok'=>true,'ts'=>date('c')]); }
}
