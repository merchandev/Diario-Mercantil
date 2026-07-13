<?php
require_once "backend/src/Exceptions/HttpException.php";
require_once "backend/src/Response.php";
try {
    throw new HttpException(401, 'unauthorized', 'No autenticado');
} catch (HttpException $e) {
    echo "CAUGHT HTTP_EXCEPTION: " . $e->status . "\n";
} catch (Throwable $e) {
    echo "CAUGHT THROWABLE: " . $e->getMessage() . "\n";
}
