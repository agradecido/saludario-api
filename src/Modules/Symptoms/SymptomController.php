<?php
declare(strict_types=1);

namespace App\Modules\Symptoms;

use App\Common\BaseController;

class SymptomController extends BaseController
{
    public function list(array $data, array $vars): ?array
    {
        $userId = $this->requireAuth();

        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $limit = max(1, min(100, $limit));

        $cursor = $_GET['cursor'] ?? null;
        $symptomCode = $_GET['symptom_code'] ?? null;
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;

        $params = ['user_id' => $userId];
        $where = ['user_id = :user_id'];

        if ($symptomCode) {
            $where[] = 'symptom_code = :symptom_code';
            $params['symptom_code'] = $symptomCode;
        }

        if ($from) {
            $where[] = 'occurred_at >= :from_date';
            $params['from_date'] = $from;
        }

        if ($to) {
            $where[] = 'occurred_at <= :to_date';
            $params['to_date'] = $to;
        }

        if ($cursor) {
            $cursorData = json_decode(base64_decode($cursor), true);
            if ($cursorData && isset($cursorData['occurred_at']) && isset($cursorData['id'])) {
                $where[] = '(occurred_at, id) < (:cursor_occurred_at, :cursor_id)';
                $params['cursor_occurred_at'] = $cursorData['occurred_at'];
                $params['cursor_id'] = $cursorData['id'];
            }
        }

        $whereClause = implode(' AND ', $where);

        $sql = "SELECT id, symptom_code, severity, notes, occurred_at, created_at, updated_at
                FROM symptom_events
                WHERE {$whereClause}
                ORDER BY occurred_at DESC, id DESC
                LIMIT :limit";

        $stmt = $this->db->getConnection()->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue(':' . $key, $val);
        }
        $stmt->bindValue(':limit', $limit + 1, \PDO::PARAM_INT);
        $stmt->execute();
        $symptoms = $stmt->fetchAll();

        $nextCursor = null;
        if (count($symptoms) > $limit) {
            array_pop($symptoms);
            $last = end($symptoms);
            $nextCursor = base64_encode(json_encode([
                'occurred_at' => $last['occurred_at'],
                'id' => $last['id']
            ]));
        }

        return $this->jsonResponse([
            'symptoms' => $symptoms,
            'next_cursor' => $nextCursor
        ], 200);
    }

    public function create(array $data, array $vars): ?array
    {
        $userId = $this->requireAuth();

        $symptomCode = $data['symptom_code'] ?? null;
        $severity = isset($data['severity']) ? (int)$data['severity'] : 1;
        $notes = $data['notes'] ?? null;
        $occurredAt = $data['occurred_at'] ?? null;

        if (!$symptomCode || !$occurredAt) {
            $this->errorResponse('Missing required fields: symptom_code, occurred_at.', 400);
        }

        $id = $this->generateUuid();

        $this->db->execute(
            'INSERT INTO symptom_events (id, user_id, symptom_code, severity, notes, occurred_at)
             VALUES (?, ?, ?, ?, ?, ?)',
            [$id, $userId, $symptomCode, $severity, $notes, $occurredAt]
        );

        $symptom = $this->db->fetch('SELECT * FROM symptom_events WHERE id = ?', [$id]);
        return $this->jsonResponse(['symptom' => $symptom], 201);
    }
}
