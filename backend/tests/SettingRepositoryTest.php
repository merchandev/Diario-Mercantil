<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/Repositories/SettingRepository.php';
require_once __DIR__ . '/../src/Exceptions/HttpException.php';
require_once __DIR__ . '/../src/Http/SettingSchema.php';

final class SettingRepositoryTest extends TestCase
{
    public function testUpsertSupportsProductionSchemaWithRequiredCreatedAt(): void
    {
        $pdo = new PDO('sqlite::memory:');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec(
            'CREATE TABLE settings (`key` TEXT PRIMARY KEY,value TEXT NOT NULL,'
            . 'created_at TEXT NOT NULL,updated_at TEXT NOT NULL)'
        );

        $repository = new SettingRepository($pdo);
        $repository->set('price_per_folio_usd', '3.5', '2026-08-31 12:00:00');
        $repository->set('price_per_folio_usd', '4.0', '2026-08-31 12:01:00');

        $row = $pdo->query("SELECT * FROM settings WHERE `key`='price_per_folio_usd'")->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('4.0', $row['value']);
        $this->assertSame('2026-08-31 12:00:00', $row['created_at']);
        $this->assertSame('2026-08-31 12:01:00', $row['updated_at']);
    }

    public function testUpsertSupportsLegacySqliteSchemaWithoutCreatedAt(): void
    {
        $pdo = new PDO('sqlite::memory:');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec('CREATE TABLE settings (`key` TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL)');

        $repository = new SettingRepository($pdo);
        $repository->set('banner_main_1', '/api/uploads/14', '2026-08-31 12:00:00');

        $this->assertSame(
            '/api/uploads/14',
            $pdo->query("SELECT value FROM settings WHERE `key`='banner_main_1'")->fetchColumn()
        );
    }

    public function testSchemaAcceptsExistingPreviewFlagAndRejectsUnknownKeys(): void
    {
        $this->assertSame('1', SettingSchema::validate('raptor_mini_preview_enabled', '1'));
        $this->expectException(HttpException::class);
        SettingSchema::validate('unknown_setting', 'value');
    }

    public function testSchemaExposesEveryBannerSettingPublicly(): void
    {
        $bannerKeys = SettingSchema::bannerKeys();

        $this->assertCount(7, $bannerKeys);
        $this->assertContains('banner_header_global', $bannerKeys);
        $this->assertContains('banner_history_1', $bannerKeys);
        $this->assertContains('banner_history_2', $bannerKeys);
        $this->assertContains('banner_history_3', $bannerKeys);
        $this->assertTrue(SettingSchema::isBannerKey('banner_header_global'));
        $this->assertTrue(SettingSchema::isBannerKey('banner_history_3'));
        $this->assertFalse(SettingSchema::isBannerKey('app_name'));

        foreach ($bannerKeys as $key) {
            $this->assertContains($key, SettingSchema::publicKeys());
            $this->assertSame('/api/uploads/200', SettingSchema::validate($key, '/api/uploads/200'));
        }
    }
}
