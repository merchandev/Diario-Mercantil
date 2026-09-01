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
