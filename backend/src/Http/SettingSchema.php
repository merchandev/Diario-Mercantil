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
    ];

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

        return (string)$value;
    }
}
