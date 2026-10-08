<?php
use PHPUnit\Framework\TestCase;
require_once __DIR__.'/../src/Services/EditionIdentityService.php';
final class EditionIdentityServiceTest extends TestCase {
    private PDO $pdo;
    protected function setUp(): void {
        $this->pdo=new PDO('sqlite::memory:');
        $this->pdo->exec('CREATE TABLE edition_sequences(publication_year INTEGER PRIMARY KEY,last_number INTEGER)');
        $this->pdo->exec('CREATE TABLE editions(id INTEGER PRIMARY KEY,code TEXT,cve TEXT UNIQUE,publication_year INTEGER,edition_no INTEGER,deleted_at TEXT)');
        $this->pdo->exec('CREATE UNIQUE INDEX active_number ON editions(publication_year,edition_no) WHERE deleted_at IS NULL');
        $this->pdo->exec('CREATE TABLE edition_link_aliases(alias TEXT PRIMARY KEY,edition_id INTEGER)');
    }
    public function testReuseDoesNotRedirectAnOldLink(): void {
        $this->pdo->exec("INSERT INTO editions VALUES(1,'MMXXVI-0001','DM-FIRST',2026,1,NULL),(2,'MMXXVI-0002','DM-OLD',2026,2,'2026-10-07')");
        $this->pdo->exec("INSERT INTO edition_link_aliases VALUES('MMXXVI-0002',2)");
        $s=new EditionIdentityService($this->pdo);
        $this->pdo->beginTransaction();
        $number=$s->nextNumber(2026);
        $this->assertSame(2,$number);
        $this->pdo->exec("INSERT INTO editions VALUES(3,'MMXXVI-0002','DM-NEW',2026,2,NULL)");
        $this->pdo->commit();
        $this->assertSame(2,(int)$s->resolve('MMXXVI-0002')['id']);
        $this->assertSame(3,(int)$s->resolve('DM-NEW')['id']);
        $this->pdo->exec('DELETE FROM editions WHERE id=2');
        $this->assertNull($s->resolve('MMXXVI-0002'));
        $this->assertSame(3,(int)$s->resolve('DM-NEW')['id']);
    }
    public function testOldHighWaterMarkDoesNotSkipTheInitialNumber(): void {
        $this->pdo->exec('INSERT INTO edition_sequences VALUES(2026,15)');
        $this->pdo->exec("INSERT INTO editions VALUES(1,'MMXXVI-0010','DM-TEN',2026,10,NULL)");
        $this->pdo->beginTransaction();
        $this->assertSame(1,(new EditionIdentityService($this->pdo))->nextNumber(2026));
        $this->pdo->rollBack();
    }
    public function testCveDoesNotEncodeEditionNumber(): void {
        $a=EditionIdentityService::cve(); $b=EditionIdentityService::cve();
        $this->assertMatchesRegularExpression('/^DM-[A-F0-9]{24}$/',$a);
        $this->assertNotSame($a,$b);
        $this->assertSame('MMXXVI-0002',EditionIdentityService::code(2026,2));
    }
}
