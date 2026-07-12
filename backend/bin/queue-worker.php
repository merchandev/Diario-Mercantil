<?php
// Script de Worker de Colas
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "Iniciando worker de colas...\n";

$heartbeatFile = '/tmp/worker_heartbeat';

// Bucle principal del worker
while (true) {
    // Actualizar el timestamp del archivo heartbeat para el healthcheck de Docker
    touch($heartbeatFile);
    
    // Aquí se procesarían los trabajos de la cola, por ejemplo:
    // - Envío de correos asíncronos
    // - Generación de PDFs pesados
    // - Procesamiento de lotes
    
    // Pausa breve para evitar alto consumo de CPU
    sleep(5);
}
