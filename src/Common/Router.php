<?php
declare(strict_types=1);

namespace App\Common;

use App\Common\Database;
use App\Modules\Auth\AuthController;
use App\Modules\Categories\CategoryController;
use App\Modules\Entries\EntryController;
use App\Modules\Symptoms\SymptomController;
use FastRoute\Dispatcher;
use FastRoute\RouteCollector;
use Monolog\Logger;
use function FastRoute\simpleDispatcher;

class Router
{
    public function __construct(
        private Database $db,
        private Logger $logger
    ) {}

    public function dispatch(): void
    {
        $dispatcher = simpleDispatcher(function(RouteCollector $r) {
            $r->addRoute('POST', '/api/v1/auth/register', [AuthController::class, 'register']);
            $r->addRoute('POST', '/api/v1/auth/login', [AuthController::class, 'login']);
            $r->addRoute('POST', '/api/v1/auth/logout', [AuthController::class, 'logout']);
            $r->addRoute('GET', '/api/v1/auth/session', [AuthController::class, 'session']);

            $r->addRoute('GET', '/api/v1/categories', [CategoryController::class, 'list']);

            $r->addRoute('GET', '/api/v1/entries', [EntryController::class, 'list']);
            $r->addRoute('POST', '/api/v1/entries', [EntryController::class, 'create']);
            $r->addRoute('PATCH', '/api/v1/entries/{id}', [EntryController::class, 'update']);
            $r->addRoute('DELETE', '/api/v1/entries/{id}', [EntryController::class, 'delete']);

            $r->addRoute('GET', '/api/v1/symptoms', [SymptomController::class, 'list']);
            $r->addRoute('POST', '/api/v1/symptoms', [SymptomController::class, 'create']);
        });

        $httpMethod = $_SERVER['REQUEST_METHOD'];
        $uri = $_SERVER['REQUEST_URI'];

        if (false !== $pos = strpos($uri, '?')) {
            $uri = substr($uri, 0, $pos);
        }
        $uri = rawurldecode($uri);

        $routeInfo = $dispatcher->dispatch($httpMethod, $uri);

        switch ($routeInfo[0]) {
            case Dispatcher::NOT_FOUND:
                http_response_code(404);
                echo json_encode(['error' => 'Not Found']);
                break;
            case Dispatcher::METHOD_NOT_ALLOWED:
                $allowedMethods = $routeInfo[1];
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                break;
            case Dispatcher::FOUND:
                $handler = $routeInfo[1];
                $vars = $routeInfo[2];
                $this->executeHandler($handler, $vars);
                break;
        }
    }

    private function executeHandler(array $handler, array $vars): void
    {
        [$controllerClass, $method] = $handler;
        $controller = new $controllerClass($this->db, $this->logger);

        $requestData = [];
        if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PATCH') {
            $body = file_get_contents('php://input');
            $requestData = json_decode($body, true) ?? [];
        }

        $response = $controller->$method($requestData, $vars);
        if ($response !== null) {
            header('Content-Type: application/json');
            echo json_encode($response);
        }
    }
}
