<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use App\Common\ErrorHandler;
use App\Common\Router;
use App\Common\Database;

$logger = new Logger('saludario');
$logger->pushHandler(new StreamHandler('php://stdout', Logger::INFO));

// Register global error handler
ErrorHandler::register($logger);

if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
}

$dbUrl = $_ENV['DATABASE_URL'] ?? 'pgsql:host=db;port=5432;dbname=saludario;user=postgres;password=postgres';
$db = new Database($dbUrl);

// Dynamic CORS for credentials
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: " . $origin);
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    die();
}

$router = new Router($db, $logger);
$router->dispatch();
