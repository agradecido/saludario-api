<?php

require_once 'vendor/autoload.php';

use Dotenv\Dotenv;

if (file_exists(__DIR__ . '/.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__);
    $dotenv->load();
}

$dbUrl = $_ENV['DATABASE_URL'] ?? 'pgsql:host=db;port=5432;dbname=saludario;user=postgres;password=postgres';
preg_match('/pgsql:host=([^;]+);port=([^;]+);dbname=([^;]+);user=([^;]+);password=(.*)/', $dbUrl, $matches);

return [
    'paths' => [
        'migrations' => '%%PHINX_CONFIG_DIR%%/db/migrations',
        'seeds' => '%%PHINX_CONFIG_DIR%%/db/seeds'
    ],
    'environments' => [
        'default_migration_table' => 'phinxlog',
        'default_environment' => 'development',
        'development' => [
            'adapter' => 'pgsql',
            'host' => $matches[1] ?? 'localhost',
            'name' => $matches[3] ?? 'saludario',
            'user' => $matches[4] ?? 'postgres',
            'pass' => $matches[5] ?? 'postgres',
            'port' => $matches[2] ?? '5432',
            'charset' => 'utf8'
        ]
    ],
    'version_order' => 'creation'
];
