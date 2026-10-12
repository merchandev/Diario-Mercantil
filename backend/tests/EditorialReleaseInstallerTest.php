<?php
declare(strict_types=1);
use PHPUnit\Framework\TestCase;
require_once __DIR__.'/../src/Services/EditorialReleaseInstaller.php';
final class EditorialReleaseInstallerTest extends TestCase {
    private PDO $pdo;
    private string $uploads;
    protected function setUp(): void {
        $this->pdo=new PDO('sqlite::memory:'); $this->pdo->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
        $this->pdo->exec('CREATE TABLE pages(id INTEGER PRIMARY KEY,slug TEXT UNIQUE,title TEXT,body_json TEXT,header_html TEXT,footer_html TEXT,status TEXT,created_at TEXT,updated_at TEXT)');
        $this->pdo->exec('CREATE TABLE settings(`key` TEXT PRIMARY KEY,value TEXT,created_at TEXT,updated_at TEXT)');
        $this->pdo->exec('CREATE TABLE files(id INTEGER PRIMARY KEY,name TEXT,path TEXT,size INTEGER,type TEXT,checksum TEXT,version INTEGER,status TEXT,owner TEXT,is_public INTEGER,deleted_at TEXT,created_at TEXT,updated_at TEXT)');
        $this->pdo->exec("INSERT INTO pages(slug,title,body_json,status) VALUES('nueva-pgina','Vacía','[]','published')");
        $this->uploads=sys_get_temp_dir().'/dm_editorial_'.bin2hex(random_bytes(8));
    }
    protected function tearDown(): void {
        if (!is_dir($this->uploads)) return;
        foreach (glob($this->uploads.'/editorial-v1026/*') ?: [] as $file) unlink($file);
        if (is_dir($this->uploads.'/editorial-v1026')) rmdir($this->uploads.'/editorial-v1026');
        rmdir($this->uploads);
    }
    private function installer(?string $uploads=null): EditorialReleaseInstaller {
        return new EditorialReleaseInstaller($this->pdo,__DIR__.'/../resources/editorial',$uploads ?? $this->uploads);
    }
    public function testPreviewDoesNotWriteAndFirstInstallIsCompleteAndIdempotent(): void {
        $preview=$this->installer()->run();
        $this->assertSame('preview',$preview['mode']);
        $this->assertSame(1,(int)$this->pdo->query('SELECT COUNT(*) FROM pages')->fetchColumn());
        $this->assertDirectoryDoesNotExist($this->uploads);
        $this->installer()->run(true);
        $this->assertSame(5,(int)$this->pdo->query("SELECT COUNT(*) FROM pages WHERE status='published'")->fetchColumn());
        $this->assertSame(7,(int)$this->pdo->query('SELECT COUNT(*) FROM files WHERE is_public=1')->fetchColumn());
        $this->assertSame(7,(int)$this->pdo->query("SELECT COUNT(*) FROM settings WHERE value LIKE '/api/uploads/%'")->fetchColumn());
        $this->assertSame('draft',$this->pdo->query("SELECT status FROM pages WHERE slug='nueva-pgina'")->fetchColumn());
        $repeat=$this->installer()->run(true);
        $this->assertSame(['preserved'],array_values(array_unique($repeat['pages'])));
        $this->assertSame(['preserved'],array_values(array_unique($repeat['banners'])));
        $this->assertSame(7,(int)$this->pdo->query('SELECT COUNT(*) FROM files')->fetchColumn());
    }
    public function testExistingEditorialContentAndConfiguredBannerRemainIntact(): void {
        $this->pdo->exec("INSERT INTO pages(slug,title,body_json,status) VALUES('terminos-y-condiciones','Texto del editor','[{\"type\":\"paragraph\",\"props\":{\"text\":\"Condiciones propias\"}}]','draft')");
        $this->pdo->exec("INSERT INTO settings(`key`,value) VALUES('banner_main_1','/api/uploads/999')");
        $this->installer()->run(true);
        $this->assertSame('Texto del editor',$this->pdo->query("SELECT title FROM pages WHERE slug='terminos-y-condiciones'")->fetchColumn());
        $this->assertSame('draft',$this->pdo->query("SELECT status FROM pages WHERE slug='terminos-y-condiciones'")->fetchColumn());
        $this->assertSame('/api/uploads/999',$this->pdo->query("SELECT value FROM settings WHERE `key`='banner_main_1'")->fetchColumn());
    }
    public function testFilesystemFailureRollsBackDatabaseChanges(): void {
        try { $this->installer(__FILE__)->run(true); $this->fail('Expected directory failure'); } catch (RuntimeException $error) { $this->assertStringContainsString('directorio',$error->getMessage()); }
        $this->assertSame(1,(int)$this->pdo->query('SELECT COUNT(*) FROM pages')->fetchColumn());
        $this->assertSame(0,(int)$this->pdo->query('SELECT COUNT(*) FROM files')->fetchColumn());
        $this->assertSame(0,(int)$this->pdo->query('SELECT COUNT(*) FROM settings')->fetchColumn());
    }
}
