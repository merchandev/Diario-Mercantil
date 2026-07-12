<?php
require 'vendor/autoload.php';
$openapi = \OpenApi\Generator::scan([__DIR__ . '/src']);
file_put_contents('openapi.yaml', $openapi->toYaml());
