<?php
declare(strict_types=1);

namespace App\Common;

use App\Common\Database;
use Monolog\Logger;
use Ramsey\Uuid\Uuid;

abstract class BaseController
{
    protected Database $db;
    protected Logger $logger;

    public function __construct(Database $db, Logger $logger)
    {
        $this->db = $db;
        $this->logger = $logger;
        $this->startSession();
        $this->checkCsrf();
    }

    protected function startSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start([
                'cookie_httponly' => true,
                'cookie_samesite' => 'Lax'
            ]);
        }
    }

    protected function checkCsrf(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if (in_array($method, ['POST', 'PATCH', 'PUT', 'DELETE'], true)) {
            $requestedWith = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
            if (strtolower($requestedWith) !== 'xmlhttprequest') {
                $this->errorResponse('CSRF token mismatch or missing X-Requested-With header.', 403);
            }
        }
    }

    protected function requireAuth(): string
    {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            die();
        }
        return $_SESSION['user_id'];
    }

    protected function jsonResponse(array $data, int $status = 200): ?array
    {
        http_response_code($status);
        return $data;
    }

    protected function errorResponse(string $message, int $status = 400): void
    {
        http_response_code($status);
        header('Content-Type: application/problem+json');
        echo json_encode([
            'type' => 'about:blank',
            'title' => $status === 400 ? 'Bad Request' : 'Error',
            'status' => $status,
            'detail' => $message,
        ]);
        die();
    }

    protected function generateUuid(): string
    {
        return Uuid::uuid4()->toString();
    }
}
