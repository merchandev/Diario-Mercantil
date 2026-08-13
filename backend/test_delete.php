<?php
require_once "src/System/Database.php";
require_once "src/Role.php";
require_once "src/RolePolicy.php";

$actor = ["id" => 2, "role" => "admin"];
$target = ["id" => 3, "role" => "solicitante"];
echo "Can delete? " . (RolePolicy::canDeleteUser($actor, $target) ? "YES" : "NO") . "\n";

