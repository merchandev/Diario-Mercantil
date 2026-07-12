<?php

class MetricsController
{
    public function prometheus(): void
    {
        $metrics = [];
        $metrics[] = "# HELP dm_up Whether the application database is reachable";
        $metrics[] = "# TYPE dm_up gauge";
        
        $up = 1;
        try {
            require_once __DIR__.'/Database.php';
            $pdo = Database::pdo();
            
            $usersCount = $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
            $requestsCount = $pdo->query('SELECT COUNT(*) FROM legal_requests')->fetchColumn();
            $editionsCount = $pdo->query('SELECT COUNT(*) FROM editions')->fetchColumn();
            
            $metrics[] = "# HELP dm_users_total Total number of registered users";
            $metrics[] = "# TYPE dm_users_total gauge";
            $metrics[] = "dm_users_total $usersCount";

            $metrics[] = "# HELP dm_requests_total Total number of legal requests";
            $metrics[] = "# TYPE dm_requests_total gauge";
            $metrics[] = "dm_requests_total $requestsCount";
            
            $metrics[] = "# HELP dm_editions_total Total number of editions";
            $metrics[] = "# TYPE dm_editions_total gauge";
            $metrics[] = "dm_editions_total $editionsCount";
            
        } catch (Throwable $e) {
            $up = 0;
            error_log('[metrics] ' . $e->getMessage());
        }
        
        $metrics[] = "dm_up $up";

        header('Content-Type: text/plain; version=0.0.4');
        echo implode("\n", $metrics) . "\n";
    }
}
