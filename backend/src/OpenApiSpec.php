<?php

namespace OpenApi;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: "1.0.0",
    title: "Diario Mercantil API",
    description: "Documentación de la API de Diario Mercantil para gestión de usuarios, publicaciones, archivos y salud."
)]
#[OA\Server(
    url: "https://diariomercantil.com/api",
    description: "Servidor de Producción"
)]
#[OA\Server(
    url: "http://localhost/api",
    description: "Servidor de Desarrollo"
)]
#[OA\SecurityScheme(
    securityScheme: "bearerAuth",
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Token de autenticación proveído tras el login en el header Authorization (Bearer <token>)"
)]
class OpenApiSpec
{
}
