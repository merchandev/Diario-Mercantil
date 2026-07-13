<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../vendor/autoload.php';

class EmailService {
    private static function getMailer(): PHPMailer {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = getenv('SMTP_HOST') ?: 'smtp.hostinger.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = getenv('SMTP_USER') ?: 'diariomercantil@merchan.cloud';
        $mail->Password   = getenv('SMTP_PASS') ?: 'GOku*1896';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port       = getenv('SMTP_PORT') ?: 465;
        $mail->CharSet    = 'UTF-8';
        $mail->setFrom($mail->Username, 'Diario Mercantil');
        $mail->isHTML(true);
        return $mail;
    }

    private static function renderTemplate(string $title, string $content): string {
        $year = date('Y');
        // Usamos colores de la marca: Rojo principal (#c0252b), fondo neutro.
        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background-color: #c0252b; color: #ffffff; padding: 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
                .content { padding: 30px; color: #333333; line-height: 1.6; }
                .content h2 { color: #c0252b; font-size: 20px; margin-top: 0; }
                .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 13px; border-top: 1px solid #eeeeee; }
                .btn { display: inline-block; background-color: #c0252b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Diario Mercantil</h1>
                </div>
                <div class="content">
                    $content
                </div>
                <div class="footer">
                    &copy; $year Diario Mercantil de Venezuela. Todos los derechos reservados.<br>
                    Este es un mensaje automático, por favor no responda a este correo.
                </div>
            </div>
        </body>
        </html>
        HTML;
    }

    public static function sendWelcome(string $to, string $name) {
        $mail = self::getMailer();
        $mail->addAddress($to, $name);
        $mail->Subject = 'Bienvenido al Diario Mercantil';
        
        $content = <<<HTML
        <h2>¡Hola, $name!</h2>
        <p>Gracias por registrarte en el <strong>Diario Mercantil</strong>.</p>
        <p>Tu cuenta ha sido creada exitosamente. A partir de ahora podrás gestionar la publicación de documentos legales, carteles de citación, asambleas y más de forma rápida y segura a través de nuestra plataforma.</p>
        <p>Si tienes alguna duda o necesitas asistencia, nuestro equipo está listo para ayudarte.</p>
        HTML;

        $mail->Body = self::renderTemplate('Bienvenido', $content);
        return $mail->send();
    }

    public static function sendPasswordReset(string $to, string $name, string $token) {
        $mail = self::getMailer();
        $mail->addAddress($to, $name);
        $mail->Subject = 'Recuperacion de contrasena - Diario Mercantil';
        
        // Link del frontend para reset. En un entorno real se tomaría de la config.
        $baseUrl = getenv('FRONTEND_URL') ?: 'http://localhost:5173';
        // Ajustar el puerto 80 para producción o localhost si se requiere
        if (getenv('FRONTEND_URL') === false) {
           // Intenta auto-detectar
           $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
           $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
           $baseUrl = "$protocol://$host";
        }
        $resetLink = rtrim($baseUrl, '/') . "/reset-password?token=" . urlencode($token);

        $content = <<<HTML
        <h2>Recuperación de contraseña</h2>
        <p>Hola, $name.</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el Diario Mercantil.</p>
        <p>Haz clic en el siguiente botón para elegir una nueva contraseña:</p>
        <div style="text-align: center;">
            <a href="$resetLink" class="btn" style="color: #ffffff !important;">Restablecer Contraseña</a>
        </div>
        <p style="margin-top: 30px;">Si no has solicitado este cambio, por favor ignora este mensaje. El enlace expirará en 1 hora.</p>
        HTML;

        $mail->Body = self::renderTemplate('Recuperar contraseña', $content);
        return $mail->send();
    }

    public static function sendPendingPayment(string $to, string $name, string $orderNo) {
        $mail = self::getMailer();
        $mail->addAddress($to, $name);
        $mail->Subject = "Solicitud Recibida (Pendiente por verificacion) - $orderNo";
        
        $content = <<<HTML
        <h2>Solicitud Recibida</h2>
        <p>Hola, $name.</p>
        <p>Hemos recibido tu solicitud de publicación con el número de orden <strong>$orderNo</strong>.</p>
        <p>Actualmente se encuentra en estado <strong>Por verificar</strong>. Nuestro equipo de administración validará el pago y los documentos anexados.</p>
        <p>Recibirás una notificación en cuanto el estado de tu solicitud se actualice.</p>
        HTML;

        $mail->Body = self::renderTemplate('Solicitud en Verificación', $content);
        return $mail->send();
    }

    public static function sendInReview(string $to, string $name, string $orderNo) {
        $mail = self::getMailer();
        $mail->addAddress($to, $name);
        $mail->Subject = "Solicitud En Tramite - $orderNo";
        
        $content = <<<HTML
        <h2>Solicitud En Trámite</h2>
        <p>Hola, $name.</p>
        <p>El pago y los documentos de tu solicitud <strong>$orderNo</strong> han sido verificados correctamente.</p>
        <p>Tu solicitud se encuentra ahora <strong>En trámite</strong> y será incluida en la próxima edición disponible, según las fechas de publicación requeridas.</p>
        <p>Te notificaremos en cuanto haya sido publicada.</p>
        HTML;

        $mail->Body = self::renderTemplate('Solicitud En Trámite', $content);
        return $mail->send();
    }

    public static function sendPublished(string $to, string $name, string $orderNo, string $editionCode) {
        $mail = self::getMailer();
        $mail->addAddress($to, $name);
        $mail->Subject = "Publicacion Exitosa - $orderNo";
        
        $content = <<<HTML
        <h2>¡Tu documento ha sido publicado!</h2>
        <p>Hola, $name.</p>
        <p>Te informamos que tu solicitud <strong>$orderNo</strong> ha sido incorporada en la edición <strong>$editionCode</strong> del Diario Mercantil.</p>
        <p>Ya puedes acceder a nuestra plataforma para ver la edición oficial o generar el certificado digital de publicación legal.</p>
        <p>Gracias por confiar en nosotros.</p>
        HTML;

        $mail->Body = self::renderTemplate('Publicación Exitosa', $content);
        return $mail->send();
    }

    public static function sendRejected(string $to, string $name, string $orderNo, string $reason) {
        $mail = self::getMailer();
        $mail->addAddress($to, $name);
        $mail->Subject = "Solicitud Rechazada - $orderNo";
        
        $content = <<<HTML
        <h2>Atención con tu solicitud $orderNo</h2>
        <p>Hola, $name.</p>
        <p>Lamentablemente, tu solicitud de publicación no pudo ser procesada y ha sido <strong>Rechazada</strong>.</p>
        <p><strong>Motivo indicado por el administrador:</strong></p>
        <blockquote style="border-left: 4px solid #c0252b; padding-left: 10px; color: #555; background-color: #f9f9f9; padding: 10px;">
            $reason
        </blockquote>
        <p>Por favor, revisa la información en tu panel e intenta crear una nueva solicitud con los datos corregidos si corresponde.</p>
        HTML;

        $mail->Body = self::renderTemplate('Solicitud Rechazada', $content);
        return $mail->send();
    }
}
