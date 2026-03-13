<?php
declare(strict_types=1);

namespace App\Common;

use Monolog\Logger;
use Throwable;

class ErrorHandler
{
    public static function register(Logger $logger): void
    {
        set_error_handler(function ($severity, $message, $file, $line) use ($logger) {
            if (!(error_reporting() & $severity)) {
                return false;
            }
            throw new \ErrorException($message, 0, $severity, $file, $line);
        });

        set_exception_handler(function (Throwable $e) use ($logger) {
            $code = $e->getCode();
            if ($code < 400 || $code > 599) {
                $code = 500;
            }

            if ($code === 500) {
                $logger->error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            } else {
                $logger->warning($e->getMessage());
            }

            http_response_code($code);
            header('Content-Type: application/problem+json');

            echo json_encode([
                'type' => 'about:blank',
                'title' => $code === 500 ? 'Internal Server Error' : 'Bad Request',
                'status' => $code,
                'detail' => $e->getMessage(),
            ]);
            die();
        });
    }
}
