# Sistema de Gestión Digital - Diario Mercantil de Venezuela

Plataforma integral para la gestión, publicación y verificación de documentos legales y avisos mercantiles. Este sistema automatiza el flujo de trabajo editorial, desde la solicitud del cliente hasta la publicación digital y la generación de ediciones compaginadas.

## 🚀 Características Principales

### 👥 Gestión de Usuarios
- **Roles y Permisos**: Sistema jerárquico (SuperAdmin, Administrador, Solicitante).
- **Autenticación Segura**: Manejo de sesiones persistentes y cierre automático por inactividad.

### 📄 Publicaciones Legales
- **Procesamiento de Documentos**: Carga y análisis de documentos PDF.
- **Cálculo Automático**: Estimación de costos basada en folios y tasas indexadas (BCV).
- **Recibos Digitales**: Generación automática de órdenes de servicio y recibos en PDF.

### 🔍 Verificación y Acceso Público
- **Validación QR**: Módulo de acceso público para verificar la autenticidad de las publicaciones.
- **Ruta Pública**: Acceso directo a documentos mediante `/ver/{orden}`.

### 📚 Ediciones Digitales
- **Compaginación**: Organización y publicación de la edición diaria del diario.
- **Visor Interactivo**: Visualización fluida de las ediciones digitales.

## 🛠️ Stack Tecnológico

La aplicación está construida utilizando una arquitectura moderna y robusta:

- **Frontend**: 
  - React 18
  - TypeScript
  - TailwindCSS
  - Vite (Build tool)

- **Backend**: 
  - PHP 8.2 (Arquitectura MVC personalizada)
  - PDO (Abstracción de Base de Datos)
  - FPDF (Generación de documentos)

- **Infraestructura**:
  - Docker & Docker Compose
  - Nginx (Web Server)
  - MySQL / MariaDB

## 📦 Instalación y Despliegue

### Requisitos Previos
- Docker y Docker Compose instalados.
- Git.

### Configuración Local

1. **Clonar el repositorio**:
   ```bash
   git clone <url-del-repositorio>
   cd diario-mercantil
   ```

2. **Configurar variables de entorno**:
   Copia el archivo de ejemplo y ajusta los valores necesarios.
   ```bash
   cp .env.example .env
   ```

3. **Iniciar los servicios**:
   ```bash
   docker-compose up -d --build
   ```

4. **Acceso**:
   - Frontend: `http://localhost` (o puerto configurado)
   - Backend API: `http://localhost:8000`

## 🔒 Seguridad

Este proyecto sigue buenas prácticas de seguridad:
- Las credenciales y configurariones sensibles se manejan mediante variables de entorno.
- No se versionan archivos de configuración con secretos reales.
- El sistema incluye logs de auditoría para acciones críticas.

---
© Diario Mercantil de Venezuela - Todos los derechos reservados.
