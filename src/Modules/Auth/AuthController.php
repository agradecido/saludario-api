<?php
declare(strict_types=1);

namespace App\Modules\Auth;

use App\Common\BaseController;

class AuthController extends BaseController
{
    public function register(array $data, array $vars): ?array
    {
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;

        if (!$email || !$password) {
            $this->errorResponse('Email and password required.', 400);
        }

        $existing = $this->db->fetch('SELECT id FROM users WHERE email = ?', [$email]);
        if ($existing) {
            $this->errorResponse('Email already exists.', 409);
        }

        $id = $this->generateUuid();
        $hash = password_hash($password, PASSWORD_ARGON2ID);

        $this->db->execute(
            'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
            [$id, $email, $hash]
        );

        $_SESSION['user_id'] = $id;
        return $this->jsonResponse(['user' => ['id' => $id, 'email' => $email]], 201);
    }

    public function login(array $data, array $vars): ?array
    {
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;

        if (!$email || !$password) {
            $this->errorResponse('Email and password required.', 400);
        }

        $user = $this->db->fetch('SELECT id, password_hash FROM users WHERE email = ?', [$email]);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            $this->errorResponse('Invalid credentials.', 401);
        }

        $_SESSION['user_id'] = $user['id'];
        return $this->jsonResponse(['user' => ['id' => $user['id'], 'email' => $email]], 200);
    }

    public function logout(array $data, array $vars): ?array
    {
        session_destroy();
        return $this->jsonResponse(['message' => 'Logged out'], 200);
    }

    public function session(array $data, array $vars): ?array
    {
        if (!isset($_SESSION['user_id'])) {
            $this->errorResponse('Unauthorized', 401);
        }

        $id = $_SESSION['user_id'];
        $user = $this->db->fetch('SELECT id, email FROM users WHERE id = ?', [$id]);

        if (!$user) {
            $this->errorResponse('Unauthorized', 401);
        }

        return $this->jsonResponse(['user' => ['id' => $user['id'], 'email' => $user['email']]], 200);
    }
}
