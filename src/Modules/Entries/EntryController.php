<?php
declare(strict_types=1);

namespace App\Modules\Entries;

use App\Common\BaseController;

class EntryController extends BaseController
{
    public function list(array $data, array $vars): ?array
    {
        $userId = $this->requireAuth();

        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $limit = max(1, min(100, $limit));

        $cursor = $_GET['cursor'] ?? null;
        $categoryCode = $_GET['meal_category_code'] ?? null;
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;

        $params = ['user_id' => $userId];
        $where = ['fe.user_id = :user_id'];

        if ($categoryCode) {
            $where[] = 'mc.code = :category_code';
            $params['category_code'] = $categoryCode;
        }

        if ($from) {
            $where[] = 'fe.consumed_at >= :from_date';
            $params['from_date'] = $from;
        }

        if ($to) {
            $where[] = 'fe.consumed_at <= :to_date';
            $params['to_date'] = $to;
        }

        if ($cursor) {
            $cursorData = json_decode(base64_decode($cursor), true);
            if ($cursorData && isset($cursorData['consumed_at']) && isset($cursorData['id'])) {
                $where[] = '(fe.consumed_at, fe.id) < (:cursor_consumed_at, :cursor_id)';
                $params['cursor_consumed_at'] = $cursorData['consumed_at'];
                $params['cursor_id'] = $cursorData['id'];
            }
        }

        $whereClause = implode(' AND ', $where);

        $sql = "SELECT fe.id, mc.code as meal_category_code, fe.food_name, fe.quantity_value, fe.quantity_unit, fe.notes, fe.consumed_at, fe.created_at, fe.updated_at
                FROM food_entries fe
                JOIN meal_categories mc ON fe.meal_category_id = mc.id
                WHERE {$whereClause}
                ORDER BY fe.consumed_at DESC, fe.id DESC
                LIMIT :limit";

        $stmt = $this->db->getConnection()->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue(':' . $key, $val);
        }
        $stmt->bindValue(':limit', $limit + 1, \PDO::PARAM_INT);
        $stmt->execute();
        $entries = $stmt->fetchAll();

        $nextCursor = null;
        if (count($entries) > $limit) {
            array_pop($entries);
            $last = end($entries);
            $nextCursor = base64_encode(json_encode([
                'consumed_at' => $last['consumed_at'],
                'id' => $last['id']
            ]));
        }

        return $this->jsonResponse([
            'entries' => $entries,
            'next_cursor' => $nextCursor
        ], 200);
    }

    private function getCategoryIdByCode(string $code): ?int
    {
        $category = $this->db->fetch('SELECT id FROM meal_categories WHERE code = ?', [$code]);
        return $category ? (int)$category['id'] : null;
    }

    public function create(array $data, array $vars): ?array
    {
        $userId = $this->requireAuth();

        $mealCategoryCode = $data['meal_category_code'] ?? null;
        $foodName = $data['food_name'] ?? null;
        $quantityValue = $data['quantity_value'] ?? null;
        $quantityUnit = $data['quantity_unit'] ?? null;
        $notes = $data['notes'] ?? null;
        $consumedAt = $data['consumed_at'] ?? null;

        if (!$mealCategoryCode || !$foodName || !$consumedAt) {
            $this->errorResponse('Missing required fields: meal_category_code, food_name, consumed_at.', 400);
        }

        $mealCategoryId = $this->getCategoryIdByCode($mealCategoryCode);
        if (!$mealCategoryId) {
            $this->errorResponse('Invalid meal_category_code.', 400);
        }

        $id = $this->generateUuid();

        $this->db->execute(
            'INSERT INTO food_entries (id, user_id, meal_category_id, food_name, quantity_value, quantity_unit, notes, consumed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [$id, $userId, $mealCategoryId, $foodName, $quantityValue, $quantityUnit, $notes, $consumedAt]
        );

        $entry = $this->db->fetch(
            'SELECT fe.id, mc.code as meal_category_code, fe.food_name, fe.quantity_value, fe.quantity_unit, fe.notes, fe.consumed_at, fe.created_at, fe.updated_at
             FROM food_entries fe
             JOIN meal_categories mc ON fe.meal_category_id = mc.id
             WHERE fe.id = ?',
            [$id]
        );

        return $this->jsonResponse(['entry' => $entry], 201);
    }

    public function update(array $data, array $vars): ?array
    {
        $userId = $this->requireAuth();
        $id = $vars['id'];

        $entry = $this->db->fetch('SELECT id FROM food_entries WHERE id = ? AND user_id = ?', [$id, $userId]);
        if (!$entry) {
            $this->errorResponse('Not Found', 404);
        }

        $fields = [];
        $params = [];

        if (isset($data['meal_category_code'])) {
            $mealCategoryId = $this->getCategoryIdByCode($data['meal_category_code']);
            if (!$mealCategoryId) {
                $this->errorResponse('Invalid meal_category_code.', 400);
            }
            $fields[] = "meal_category_id = ?";
            $params[] = $mealCategoryId;
        }

        $updatableFields = ['food_name', 'quantity_value', 'quantity_unit', 'notes', 'consumed_at'];
        foreach ($updatableFields as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "{$field} = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) {
            $this->errorResponse('No fields to update.', 400);
        }

        $fields[] = 'updated_at = CURRENT_TIMESTAMP';
        $params[] = $id;
        $params[] = $userId;

        $sql = 'UPDATE food_entries SET ' . implode(', ', $fields) . ' WHERE id = ? AND user_id = ?';
        $this->db->execute($sql, $params);

        $updatedEntry = $this->db->fetch(
            'SELECT fe.id, mc.code as meal_category_code, fe.food_name, fe.quantity_value, fe.quantity_unit, fe.notes, fe.consumed_at, fe.created_at, fe.updated_at
             FROM food_entries fe
             JOIN meal_categories mc ON fe.meal_category_id = mc.id
             WHERE fe.id = ?',
            [$id]
        );

        return $this->jsonResponse(['entry' => $updatedEntry], 200);
    }

    public function delete(array $data, array $vars): ?array
    {
        $userId = $this->requireAuth();
        $id = $vars['id'];

        $entry = $this->db->fetch('SELECT id FROM food_entries WHERE id = ? AND user_id = ?', [$id, $userId]);
        if (!$entry) {
            $this->errorResponse('Not Found', 404);
        }

        $this->db->execute('DELETE FROM food_entries WHERE id = ? AND user_id = ?', [$id, $userId]);
        return $this->jsonResponse(['message' => 'Deleted'], 204);
    }
}
