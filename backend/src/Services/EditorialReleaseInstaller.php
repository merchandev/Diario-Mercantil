<?php
declare(strict_types=1);
require_once __DIR__.'/../Repositories/SettingRepository.php';

final class EditorialReleaseInstaller {
    public function __construct(private PDO $pdo, private string $resources, private string $uploads) {}

    public function run(bool $apply = false): array {
        $pages = json_decode((string)file_get_contents($this->resources.'/pages-v1026.json'), true, 512, JSON_THROW_ON_ERROR);
        $instructionDefaults = [
            'instructions_documents_text'=>'Complete los datos registrales, adjunte el PDF legible y revise los folios. Consulte el total y los datos bancarios; reporte banco emisor, teléfono, fecha y últimos seis dígitos de la referencia.',
            'instructions_convocatorias_text'=>'Complete los datos de la convocatoria y adjunte la imagen y el texto solicitado. El logo es opcional. Revise el total y reporte el Pago Móvil realizado. Administración verificará la solicitud antes de publicar.'
        ];
        $keys = ['banner_header_global','banner_main_1','banner_sidebar','promo_popup','banner_history_1','banner_history_2','banner_history_3'];
        foreach ($keys as $key) {
            $image = $this->resources.'/banners/'.$key.'.png';
            if (!is_file($image) || !getimagesize($image)) throw new RuntimeException('Falta un banner válido: '.$key);
        }
        $report = ['mode'=>$apply ? 'apply' : 'preview','pages'=>[],'banners'=>[],'placeholder'=>null];
        $copied = [];
        $now = gmdate('Y-m-d H:i:s');
        $settings = new SettingRepository($this->pdo);
        $existingSettings = $settings->getMany($keys);
        if ($apply) $this->pdo->beginTransaction();
        try {
            foreach ($pages as $page) {
                $query = $this->pdo->prepare('SELECT * FROM pages WHERE slug=?');
                $query->execute([$page['slug']]);
                $existing = $query->fetch(PDO::FETCH_ASSOC);
                // Never replace previously authored content, including image-only pages.
                $hasContent = $existing && (trim(strip_tags(($existing['header_html'] ?? '').($existing['footer_html'] ?? ''))) !== '' || count(json_decode($existing['body_json'] ?? '[]',true) ?: []) > 0);
                $report['pages'][$page['slug']] = $hasContent ? 'preserved' : ($existing ? 'filled' : 'created');
                if (!$apply || $hasContent) continue;
                $body = json_encode($page['body_blocks'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
                if ($existing) {
                    $this->pdo->prepare("UPDATE pages SET title=?,body_json=?,header_html='',footer_html=?,status='published',updated_at=? WHERE id=?")
                        ->execute([$page['title'],$body,$page['footer_html'],$now,$existing['id']]);
                } else {
                    $this->pdo->prepare("INSERT INTO pages(slug,title,body_json,header_html,footer_html,status,created_at,updated_at) VALUES(?,?,?,'',?,'published',?,?)")
                        ->execute([$page['slug'],$page['title'],$body,$page['footer_html'],$now,$now]);
                }
            }
            foreach ($keys as $key) {
                if (trim($existingSettings[$key] ?? '') !== '') { $report['banners'][$key]='preserved'; continue; }
                $report['banners'][$key]='configured';
                if (!$apply) continue;
                $source = $this->resources.'/banners/'.$key.'.png';
                $checksum = hash_file('sha256',$source);
                $relative = 'editorial-v1026/'.$key.'-'.$checksum.'.png';
                $absolute = rtrim($this->uploads,'/\\').'/'.$relative;
                if (!is_dir(dirname($absolute)) && !@mkdir(dirname($absolute),0750,true) && !is_dir(dirname($absolute))) throw new RuntimeException('No se pudo crear el directorio editorial.');
                if (!is_file($absolute)) {
                    if (!copy($source,$absolute)) throw new RuntimeException('No se pudo copiar el banner.');
                    $copied[]=$absolute;
                    chmod($absolute,0640);
                } elseif (!hash_equals($checksum,(string)hash_file('sha256',$absolute))) {
                    throw new RuntimeException('El archivo editorial existente no coincide.');
                }
                $query=$this->pdo->prepare('SELECT id FROM files WHERE path=? AND deleted_at IS NULL LIMIT 1');
                $query->execute([$relative]); $id=$query->fetchColumn();
                if (!$id) {
                    $this->pdo->prepare("INSERT INTO files(name,path,size,type,checksum,version,status,owner,is_public,created_at,updated_at) VALUES(?,?,?,'png',?,1,'processed','release-v1026',1,?,?)")
                        ->execute([$key.'.png',$relative,filesize($absolute),$checksum,$now,$now]);
                    $id=$this->pdo->lastInsertId();
                }
                $settings->set($key,'/api/uploads/'.$id,$now);
            }
            $existingInstructions=$settings->getMany(array_keys($instructionDefaults));
            foreach ($instructionDefaults as $key=>$value) {
                if ($apply && trim($existingInstructions[$key] ?? '') === '') $settings->set($key,$value,$now);
            }
            $query=$this->pdo->query("SELECT * FROM pages WHERE slug='nueva-pgina' AND status='published'");
            $placeholder=$query->fetch(PDO::FETCH_ASSOC);
            if ($placeholder && trim(strip_tags(($placeholder['header_html'] ?? '').($placeholder['footer_html'] ?? ''))) === '' && count(json_decode($placeholder['body_json'] ?? '[]',true) ?: []) === 0) {
                $report['placeholder']='draft';
                if ($apply) $this->pdo->prepare("UPDATE pages SET status='draft',updated_at=? WHERE id=?")->execute([$now,$placeholder['id']]);
            }
            if ($apply) $this->pdo->commit();
            return $report;
        } catch (Throwable $error) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            foreach ($copied as $file) if (is_file($file)) unlink($file);
            throw $error;
        }
    }
}
