<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/Services/EditorialTrashService.php';
require_once __DIR__ . '/../src/Services/PermanentDeletionService.php';
require_once __DIR__ . '/../src/Services/EditorialClock.php';

/**
 * Tests de papelera – §7 del Plan de Implementación (21-09-2026).
 *
 * Todos los tests usan SQLite en memoria para ser rápidos y sin efectos
 * secundarios en archivos físicos.
 */
final class EditorialTrashServiceTest extends TestCase
{
    private PDO $pdo;
    private EditorialTrashService $service;

    protected function setUp(): void
    {
        $this->pdo = new PDO('sqlite::memory:');
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $this->pdo->exec('
            CREATE TABLE editions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL,
                status TEXT NOT NULL,
                date TEXT,
                edition_no INTEGER,
                orders_count INTEGER DEFAULT 0,
                created_at TEXT,
                publication_year INTEGER DEFAULT 2026,
                file_id INTEGER,
                file_name TEXT,
                deleted_at TEXT,
                published_at TEXT,
                published_by INTEGER,
                published_file_checksum TEXT
            )
        ');

        $this->pdo->exec('
            CREATE TABLE legal_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                total_bs NUMERIC DEFAULT 0,
                name TEXT,
                order_no TEXT,
                date TEXT,
                edition_code TEXT,
                publish_date TEXT,
                deleted_at TEXT,
                pub_type TEXT,
                created_at TEXT
            )
        ');

        $this->pdo->exec('
            CREATE TABLE edition_orders (
                edition_id INTEGER NOT NULL,
                legal_request_id INTEGER NOT NULL,
                publication_file_id INTEGER,
                publication_file_name TEXT,
                publication_checksum TEXT,
                publication_source TEXT,
                publication_prepared_at TEXT,
                publication_updated_at TEXT,
                PRIMARY KEY (edition_id, legal_request_id)
            )
        ');

        $this->pdo->exec('
            CREATE TABLE edition_archives (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                edition_id INTEGER NOT NULL,
                file_id INTEGER,
                snapshot_json TEXT NOT NULL,
                actor_user_id INTEGER,
                reason TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        ');

        $this->pdo->exec('
            CREATE TABLE audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actor_user_id INTEGER,
                action TEXT,
                resource_type TEXT,
                resource_id INTEGER
            )
        ');

        $this->pdo->exec('
            CREATE TABLE legal_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                legal_request_id INTEGER NOT NULL,
                amount_bs NUMERIC,
                status TEXT
            )
        ');

        $this->pdo->exec('
            CREATE TABLE legal_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                legal_request_id INTEGER NOT NULL,
                file_id INTEGER NOT NULL,
                kind TEXT
            )
        ');

        $this->pdo->exec('
            CREATE TABLE files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                path TEXT,
                checksum TEXT,
                deleted_at TEXT
            )
        ');

        $this->service = new EditorialTrashService($this->pdo);
    }

    // ─── helpers ───────────────────────────────────────────────────────────────

    private function insertEdition(
        int $id,
        string $code,
        string $status = 'Borrador',
        ?string $deletedAt = null,
        ?int $fileId = null
    ): void {
        $this->pdo->prepare(
            'INSERT INTO editions(id,code,status,date,edition_no,orders_count,created_at,publication_year,file_id,deleted_at)
             VALUES(?,?,?,?,?,?,?,?,?,?)'
        )->execute([$id, $code, $status, '2026-09-21', $id, 0, '2026-09-21 00:00:00', 2026, $fileId, $deletedAt]);
    }

    private function insertRequest(
        int $id,
        string $status = 'En trámite',
        ?string $deletedAt = null,
        ?string $editionCode = null,
        ?string $publishDate = null
    ): void {
        $this->pdo->prepare(
            'INSERT INTO legal_requests(id,user_id,status,name,date,edition_code,publish_date,deleted_at)
             VALUES(?,1,?,?,?,?,?,?)'
        )->execute([$id, $status, "Solicitud $id", '2026-09-21', $editionCode, $publishDate, $deletedAt]);
    }

    private function linkOrder(int $editionId, int $requestId): void
    {
        $this->pdo->prepare(
            'INSERT INTO edition_orders(edition_id,legal_request_id) VALUES(?,?)'
        )->execute([$editionId, $requestId]);
    }

    private function auditCount(string $action): int
    {
        $s = $this->pdo->prepare('SELECT COUNT(*) FROM audit_logs WHERE action=?');
        $s->execute([$action]);
        return (int)$s->fetchColumn();
    }

    private function archiveCount(int $editionId): int
    {
        $s = $this->pdo->prepare('SELECT COUNT(*) FROM edition_archives WHERE edition_id=?');
        $s->execute([$editionId]);
        return (int)$s->fetchColumn();
    }

    private function requestStatus(int $id): string
    {
        return (string)$this->pdo->query("SELECT status FROM legal_requests WHERE id=$id")->fetchColumn();
    }

    private function requestEditionCode(int $id): ?string
    {
        $v = $this->pdo->query("SELECT edition_code FROM legal_requests WHERE id=$id")->fetchColumn();
        return ($v === false || $v === '' || $v === null) ? null : (string)$v;
    }

    private function requestPublishDate(int $id): ?string
    {
        $v = $this->pdo->query("SELECT publish_date FROM legal_requests WHERE id=$id")->fetchColumn();
        return ($v === false || $v === '' || $v === null) ? null : (string)$v;
    }

    private function editionDeletedAt(int $id): ?string
    {
        $v = $this->pdo->query("SELECT deleted_at FROM editions WHERE id=$id")->fetchColumn();
        return ($v === false || $v === '' || $v === null) ? null : (string)$v;
    }

    private function requestDeletedAt(int $id): ?string
    {
        $v = $this->pdo->query("SELECT deleted_at FROM legal_requests WHERE id=$id")->fetchColumn();
        return ($v === false || $v === '' || $v === null) ? null : (string)$v;
    }

    private function editionStatus(int $id): string
    {
        return (string)$this->pdo->query("SELECT status FROM editions WHERE id=$id")->fetchColumn();
    }

    // ─── §7 tests ──────────────────────────────────────────────────────────────

    public function testTrashDraftEditionReturnsRequestsToVerification(): void
    {
        $this->insertEdition(1, 'CVE-0001', 'Borrador');
        $this->insertRequest(10, 'En trámite', null, 'CVE-0001', '2026-09-21');
        $this->linkOrder(1, 10);

        $result = $this->service->trashEdition(1, 1);

        $this->assertTrue($result['ok']);
        $this->assertSame(1, $result['requests_requeued']);
        $this->assertNotNull($this->editionDeletedAt(1));
        $this->assertSame('Por verificar', $this->requestStatus(10));
        $this->assertNull($this->requestEditionCode(10));
        $this->assertNull($this->requestPublishDate(10));
    }

    public function testTrashPublishedEditionReturnsRequestsToVerification(): void
    {
        $this->insertEdition(2, 'CVE-0002', 'Publicada');
        $this->insertRequest(20, 'Publicada', null, 'CVE-0002', '2026-09-15');
        $this->linkOrder(2, 20);

        $result = $this->service->trashEdition(2, 1);

        $this->assertTrue($result['ok']);
        $this->assertNotNull($this->editionDeletedAt(2));
        $this->assertSame('Por verificar', $this->requestStatus(20));
        $this->assertNull($this->requestEditionCode(20));
        $this->assertNull($this->requestPublishDate(20));
    }

    public function testTrashEditionDoesNotChangeRequestInAnotherActiveEdition(): void
    {
        // Edition 3 (being trashed) and edition 4 (active, also has request 30)
        $this->insertEdition(3, 'CVE-0003', 'Borrador');
        $this->insertEdition(4, 'CVE-0004', 'Borrador');
        $this->insertRequest(30, 'En trámite', null, 'CVE-0004', '2026-09-21');
        $this->linkOrder(3, 30);
        $this->linkOrder(4, 30);

        $result = $this->service->trashEdition(3, 1);

        $this->assertTrue($result['ok']);
        // Request 30 belongs to edition 4 (active), so it must NOT be changed
        $this->assertSame(0, $result['requests_requeued']);
        $this->assertSame('En trámite', $this->requestStatus(30));
    }

    public function testRestoreEditionReturnsToDraft(): void
    {
        $this->insertEdition(5, 'CVE-0005', 'Publicada', '2026-09-20 10:00:00');
        $this->insertRequest(50, 'Por verificar');
        $this->linkOrder(5, 50);

        $result = $this->service->restoreEdition(5, 1);

        $this->assertTrue($result['ok']);
        $this->assertSame('Borrador', $result['status']);
        $this->assertTrue($result['requires_final_pdf']);
        $this->assertNull($this->editionDeletedAt(5));
        $this->assertSame('Borrador', $this->editionStatus(5));
    }

    public function testRestoreEditionKeepsEditionNumberAndCode(): void
    {
        $this->insertEdition(6, 'CVE-0006', 'Publicada', '2026-09-20 11:00:00');
        $this->insertRequest(60, 'Por verificar');
        $this->linkOrder(6, 60);

        $this->service->restoreEdition(6, 1);

        $row = $this->pdo->query('SELECT code, edition_no FROM editions WHERE id=6')->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('CVE-0006', $row['code']);
        $this->assertSame(6, (int)$row['edition_no']);
    }

    public function testRestoreEditionRejectsActiveAssociationConflict(): void
    {
        // Edition 7 trashed; request 70 already belongs to active edition 8
        $this->insertEdition(7, 'CVE-0007', 'Publicada', '2026-09-20 12:00:00');
        $this->insertEdition(8, 'CVE-0008', 'Borrador');
        $this->insertRequest(70, 'En trámite');
        $this->linkOrder(7, 70);
        $this->linkOrder(8, 70);

        $this->expectException(RuntimeException::class);
        $this->service->restoreEdition(7, 1);
    }

    public function testTrashPublicationRemovesDraftAssociation(): void
    {
        $this->insertEdition(9, 'CVE-0009', 'Borrador', null, 999);
        $this->pdo->exec("UPDATE editions SET file_id=999,file_name='final.pdf' WHERE id=9");
        $this->pdo->exec("UPDATE editions SET orders_count=1 WHERE id=9");
        $this->insertRequest(90, 'En trámite');
        $this->linkOrder(9, 90);

        $result = $this->service->trashPublication(90, 1, true);

        $this->assertTrue($result['ok']);
        // Edition final must be invalidated
        $row = $this->pdo->query('SELECT file_id, file_name, orders_count FROM editions WHERE id=9')->fetch(PDO::FETCH_ASSOC);
        $this->assertNull($row['file_id']);
        $this->assertNull($row['file_name']);
        $this->assertSame(0, (int)$row['orders_count']);
        // Request is in trash
        $this->assertNotNull(
            $this->pdo->query('SELECT deleted_at FROM legal_requests WHERE id=90')->fetchColumn()
        );
    }

    public function testTrashPublicationRejectsPublishedEditionAssociation(): void
    {
        $this->insertEdition(10, 'CVE-0010', 'Publicada');
        $this->insertRequest(100, 'Publicada');
        $this->linkOrder(10, 100);

        $this->expectException(RuntimeException::class);
        // Must reject with 409 because the edition is published
        try {
            $this->service->trashPublication(100, 1, true);
        } catch (RuntimeException $e) {
            $this->assertSame(409, $e->getCode());
            throw $e;
        }
    }

    public function testRestorePublicationReturnsToVerification(): void
    {
        $this->insertRequest(110, 'En trámite', '2026-09-20 15:00:00', 'CVE-DELETED', '2026-09-01');

        $result = $this->service->restorePublication(110, 1, true);

        $this->assertTrue($result['ok']);
        $this->assertSame('Por verificar', $result['status']);
        $this->assertSame('Por verificar', $this->requestStatus(110));
        $this->assertNull($this->requestEditionCode(110));
        $this->assertNull($this->requestPublishDate(110));
        $this->assertNull(
            $this->pdo->query('SELECT deleted_at FROM legal_requests WHERE id=110')->fetchColumn() ?: null
        );
    }

    public function testPermanentDeleteRequiresTrashFirst(): void
    {
        $this->insertRequest(120, 'En trámite'); // NOT in trash

        $service = new PermanentDeletionService($this->pdo);
        $this->expectException(RuntimeException::class);
        try {
            $service->deleteLegalRequest(120, 1);
        } catch (RuntimeException $e) {
            $this->assertSame(409, $e->getCode());
            throw $e;
        }
    }

    public function testPermanentDeleteDoesNotRemoveArchivedEditionFiles(): void
    {
        // Insert a request that has a historical association via edition_archives but no active edition_orders.
        $this->insertRequest(130, 'En trámite', '2026-09-21 00:00:00');

        // If there are live edition_orders, permanent delete must also refuse
        $this->insertEdition(11, 'CVE-0011', 'Borrador', '2026-09-20 09:00:00');
        $this->linkOrder(11, 130);

        $service = new PermanentDeletionService($this->pdo);
        $this->expectException(RuntimeException::class);
        try {
            $service->deleteLegalRequest(130, 1);
        } catch (RuntimeException $e) {
            // 409 – referenced in edition history
            $this->assertGreaterThanOrEqual(400, $e->getCode());
            throw $e;
        }
    }

    public function testSameRequestCanBeSelectedAfterVerificationAgain(): void
    {
        // After trashing an edition its request returns to "Por verificar".
        // Once the admin verifies it again ("En trámite"), it must not be
        // blocked by any deleted edition row.
        $this->insertEdition(12, 'CVE-0012', 'Borrador');
        $this->insertRequest(140, 'En trámite');
        $this->linkOrder(12, 140);

        $this->service->trashEdition(12, 1);

        // Simulate admin re-verifying: move back to En trámite
        $this->pdo->exec("UPDATE legal_requests SET status='En trámite' WHERE id=140");

        // Now there must be no active edition_orders blocking reuse
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) FROM edition_orders eo
             JOIN editions e ON e.id=eo.edition_id
             WHERE eo.legal_request_id=? AND e.deleted_at IS NULL'
        );
        $stmt->execute([140]);
        $this->assertSame(0, (int)$stmt->fetchColumn());
    }

    public function testTrashOperationsAreAtomic(): void
    {
        // Create a deliberately broken scenario: trashEdition on a missing
        // edition must not leave a dangling archive row.
        $archivesBefore = (int)$this->pdo->query('SELECT COUNT(*) FROM edition_archives')->fetchColumn();
        $auditBefore    = (int)$this->pdo->query('SELECT COUNT(*) FROM audit_logs')->fetchColumn();

        try {
            $this->service->trashEdition(9999, 1); // does not exist → exception
        } catch (RuntimeException $e) {
            // expected
        }

        $this->assertSame(
            $archivesBefore,
            (int)$this->pdo->query('SELECT COUNT(*) FROM edition_archives')->fetchColumn(),
            'No archive row must be inserted if the operation fails'
        );
        $this->assertSame(
            $auditBefore,
            (int)$this->pdo->query('SELECT COUNT(*) FROM audit_logs')->fetchColumn(),
            'No audit row must be inserted if the operation fails'
        );
    }

    public function testLegacyRetirementIsReconciledOnceWithoutChangingDate(): void
    {
        $this->insertEdition(19, 'CVE-0019', 'Publicada', '2026-09-18 22:05:24');
        $this->insertRequest(190, 'Publicada', null, 'CVE-0019', '2026-09-10');
        $this->linkOrder(19, 190);
        $this->assertSame(1, $this->service->trashEdition(19, 1, true)['requests_requeued']);
        $this->assertSame('Por verificar', $this->requestStatus(190));
        $this->assertSame('2026-09-18 22:05:24', $this->editionDeletedAt(19));
        $this->pdo->exec("UPDATE legal_requests SET status='En trámite' WHERE id=190");
        $this->assertSame(0, $this->service->trashEdition(19, 1)['requests_requeued']);
        $this->assertSame('En trámite', $this->requestStatus(190));
        $this->assertSame(1, $this->archiveCount(19));
    }

    public function testArchiveProtectsRemovedRequestAndIndividualPdf(): void
    {
        $this->insertEdition(20, 'CVE-0020', 'Borrador', null, 200);
        $this->insertRequest(200);
        $this->linkOrder(20, 200);
        $this->pdo->exec('UPDATE edition_orders SET publication_file_id=201 WHERE edition_id=20');
        $this->service->trashPublication(200, 1, true);
        $this->assertSame(0, (int)$this->pdo->query('SELECT COUNT(*) FROM edition_orders WHERE legal_request_id=200')->fetchColumn());

        $deletion = new PermanentDeletionService($this->pdo);
        $this->assertTrue($deletion->fileIsReferenced(200));
        $this->assertTrue($deletion->fileIsReferenced(201));
        $this->expectExceptionCode(409);
        $deletion->deleteLegalRequest(200, 1);
    }

    public function testLegacyRepairSkipsReverifiedRequestsAndRejectsActiveEdition(): void
    {
        $this->insertEdition(23, 'CVE-0023', 'Publicada', '2026-09-18 22:05:24');
        $this->insertRequest(240, 'En trámite');
        $this->linkOrder(23, 240);
        $this->assertSame(0, $this->service->trashEdition(23, 1, true)['requests_requeued']);
        $this->assertSame('En trámite', $this->requestStatus(240));
        $this->insertEdition(24, 'CVE-0024');
        $this->expectExceptionCode(409);
        $this->service->trashEdition(24, 1, true);
    }

    public function testPermanentDeletionPreservesArchivedDraftIdentity(): void
    {
        $this->insertEdition(21, 'CVE-0021');
        $this->service->trashEdition(21, 1);
        $this->expectExceptionCode(409);
        (new PermanentDeletionService($this->pdo))->deleteEdition(21, 1);
    }

    public function testRequestWithoutEditorialHistoryCanBePermanentlyDeleted(): void
    {
        $this->insertRequest(210, 'Borrador');
        $this->pdo->exec("INSERT INTO legal_payments(legal_request_id,amount_bs,status) VALUES(210,100,'Aprobado')");
        $this->service->trashPublication(210, 1, true);
        $this->assertSame(1, (int)$this->pdo->query('SELECT COUNT(*) FROM legal_payments WHERE legal_request_id=210')->fetchColumn());
        $result = (new PermanentDeletionService($this->pdo))->deleteLegalRequest(210, 1);
        $this->assertTrue($result['deleted']);
        $this->assertSame(0, (int)$this->pdo->query('SELECT COUNT(*) FROM legal_requests WHERE id=210')->fetchColumn());
        $this->assertSame(0, (int)$this->pdo->query('SELECT COUNT(*) FROM legal_payments WHERE legal_request_id=210')->fetchColumn());
    }

    public function testFailureAfterArchivingRollsBackEntireOperation(): void
    {
        $this->insertEdition(22, 'CVE-0022');
        $this->insertRequest(220);
        $this->linkOrder(22, 220);
        $this->pdo->exec("CREATE TRIGGER fail_requeue BEFORE UPDATE ON legal_requests BEGIN SELECT RAISE(ABORT, 'simulated failure'); END");
        try {
            $this->service->trashEdition(22, 1);
            $this->fail('Expected the update to fail');
        } catch (PDOException $e) {
            $this->assertStringContainsString('simulated failure', $e->getMessage());
        }
        $this->assertNull($this->editionDeletedAt(22));
        $this->assertSame('En trámite', $this->requestStatus(220));
        $this->assertSame(0, $this->archiveCount(22));
        $this->assertSame(0, $this->auditCount('trash_edition'));
    }

    public function testOwnerCannotTrashOrRestoreAnotherUsersPublication(): void
    {
        $this->insertRequest(230, 'Borrador');
        try {
            $this->service->trashPublication(230, 2, false);
            $this->fail('Expected forbidden');
        } catch (RuntimeException $e) {
            $this->assertSame(403, $e->getCode());
        }
        $this->service->trashPublication(230, 1, false);
        try {
            $this->service->restorePublication(230, 2, false);
            $this->fail('Expected forbidden');
        } catch (RuntimeException $e) {
            $this->assertSame(403, $e->getCode());
        }
        $this->assertSame('Borrador', $this->service->restorePublication(230, 1, false)['status']);
    }

    public function testTrashActionsAreAudited(): void
    {
        $this->insertEdition(13, 'CVE-0013', 'Borrador');
        $this->insertRequest(150, 'En trámite');
        $this->linkOrder(13, 150);

        // trashEdition produces: trash_edition + edition_trash_requeue_verification
        $this->service->trashEdition(13, 1);
        $this->assertGreaterThanOrEqual(1, $this->auditCount('trash_edition'));
        $this->assertGreaterThanOrEqual(1, $this->auditCount('edition_trash_requeue_verification'));

        // Archive snapshot saved
        $this->assertSame(1, $this->archiveCount(13));

        // restoreEdition produces: restore_edition_to_draft
        $this->pdo->exec("UPDATE legal_requests SET status='Por verificar' WHERE id=150");
        $this->service->restoreEdition(13, 1);
        $this->assertGreaterThanOrEqual(1, $this->auditCount('restore_edition_to_draft'));

        // trashPublication produces: trash_legal_request
        $this->insertEdition(14, 'CVE-0014', 'Borrador');
        $this->insertRequest(160, 'En trámite');
        $this->linkOrder(14, 160);
        $this->service->trashPublication(160, 1, true);
        $this->assertGreaterThanOrEqual(1, $this->auditCount('trash_legal_request'));

        // restorePublication produces: restore_legal_request
        $this->service->restorePublication(160, 1, true);
        $this->assertGreaterThanOrEqual(1, $this->auditCount('restore_legal_request'));
    }
}
