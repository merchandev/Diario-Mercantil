<?php
declare(strict_types=1);

final class SettingSchema
{
    private const SCHEMA = [
        'price_per_folio_usd' => ['type' => 'float', 'min' => 0.0],
        'iva_percent' => ['type' => 'float', 'min' => 0.0, 'max' => 100.0],
        'bcv_rate' => ['type' => 'float', 'min' => 0.0001],
        'bcv_rate_date' => ['type' => 'string'],
        'app_name' => ['type' => 'string'],
        'operator_legal_name' => ['type' => 'string'],
        'operator_rif' => ['type' => 'string'],
        'operator_address' => ['type' => 'string'],
        'contact_email' => ['type' => 'string'],
        'contact_whatsapp' => ['type' => 'string'],
        'social_instagram' => ['type' => 'string'],
        'social_facebook' => ['type' => 'string'],
        'social_x' => ['type' => 'string'],
        'social_linkedin' => ['type' => 'string'],

        'convocatoria_usd' => ['type' => 'float', 'min' => 0.0],
        'unit_tax_bs' => ['type' => 'float', 'min' => 0.0],
        'banner_header_global' => ['type' => 'string'],
        'banner_main_1' => ['type' => 'string'],
        'banner_sidebar' => ['type' => 'string'],
        'promo_popup' => ['type' => 'string'],
        'banner_history_1' => ['type' => 'string'],
        'banner_history_2' => ['type' => 'string'],
        'banner_history_3' => ['type' => 'string'],
        'instructions_documents_text' => ['type' => 'string'],
        'instructions_documents_image_url' => ['type' => 'string'],
        'instructions_convocatorias_text' => ['type' => 'string'],
        'default_user_role' => ['type' => 'string'],
        'registration_enabled' => ['type' => 'boolean'],
        'raptor_mini_preview_enabled' => ['type' => 'boolean'],
    ];

    /** @return list<string> */
    public static function keys(): array
    {
        return array_keys(self::SCHEMA);
    }

    /** @return list<string> */
    public static function bannerKeys(): array
    {
        return [
            'banner_header_global',
            'banner_main_1',
            'banner_sidebar',
            'promo_popup',
            'banner_history_1',
            'banner_history_2',
            'banner_history_3',
        ];
    }

    /** @return list<string> */
    public static function publicKeys(): array
    {
        return [
            'operator_legal_name',
            'operator_rif',
            'operator_address',
            'contact_email',
            'contact_whatsapp',
            'social_instagram',
            'social_facebook',
            'social_x',
            'social_linkedin',
            'registration_enabled',
            'bcv_rate',
            'price_per_folio_usd',
            'convocatoria_usd',
            'iva_percent',
            'unit_tax_bs',
            'instructions_documents_text',
            'instructions_documents_image_url',
            'instructions_convocatorias_text',
            ...self::bannerKeys(),
        ];
    }

    public static function isBannerKey(string $key): bool
    {
        return in_array($key, self::bannerKeys(), true);
    }

    public static function validate(string $key, mixed $value): mixed
    {
        if (!isset(self::SCHEMA[$key])) {
            throw new HttpException(400, 'invalid_setting_key', "Setting $key is not allowed.");
        }

        $rules = self::SCHEMA[$key];
        
        if ($rules['type'] === 'float') {
            if (!is_numeric($value)) {
                throw new HttpException(400, 'invalid_setting_type', "Setting $key must be a number.");
            }
            $val = (float)$value;
            if (isset($rules['min']) && $val < $rules['min']) {
                throw new HttpException(400, 'invalid_setting_value', "Setting $key must be >= {$rules['min']}");
            }
            if (isset($rules['max']) && $val > $rules['max']) {
                throw new HttpException(400, 'invalid_setting_value', "Setting $key must be <= {$rules['max']}");
            }
            return (string)$val;
        }

        if ($rules['type'] === 'string') {
            if (!is_string($value)) {
                throw new HttpException(400, 'invalid_setting_type', "Setting $key must be a string.");
            }
            if (in_array($key, ['operator_legal_name','operator_rif','operator_address','contact_email','contact_whatsapp','social_instagram','social_facebook','social_x','social_linkedin'], true)) {
                $value = trim($value);
                if (mb_strlen($value) > 256) throw new HttpException(422, 'invalid_setting_value', 'El dato institucional admite hasta 256 caracteres.');
                if ($value !== '' && $key === 'operator_rif' && !preg_match('/^[VEJPG]-?\d{6,10}$/iD', $value)) throw new HttpException(422, 'invalid_setting_value', 'Indique un RIF válido con su prefijo.');
                if ($value !== '' && $key === 'contact_email' && !filter_var($value, FILTER_VALIDATE_EMAIL)) throw new HttpException(422, 'invalid_setting_value', 'Indique un correo de atención válido.');
                if ($value !== '' && $key === 'contact_whatsapp' && !preg_match('/^[1-9]\d{9,14}$/D', $value)) throw new HttpException(422, 'invalid_setting_value', 'WhatsApp requiere código de país y de 10 a 15 dígitos, sin signos ni espacios.');
                if ($value !== '' && str_starts_with($key, 'social_') && (!filter_var($value, FILTER_VALIDATE_URL) || parse_url($value, PHP_URL_SCHEME) !== 'https')) throw new HttpException(422, 'invalid_setting_value', 'Las redes sociales requieren una URL HTTPS válida.');
                if ($key === 'operator_rif') $value = strtoupper($value);
            }
            return $value;
        }

        if ($rules['type'] === 'boolean') {
            if (is_bool($value)) {
                return $value ? '1' : '0';
            }
            if (in_array($value, [0, 1, '0', '1'], true)) {
                return (string) $value;
            }
            throw new HttpException(400, 'invalid_setting_type', "Setting $key must be a boolean.");
        }

        return (string)$value;
    }
}
