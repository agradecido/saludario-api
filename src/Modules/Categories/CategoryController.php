<?php
declare(strict_types=1);

namespace App\Modules\Categories;

use App\Common\BaseController;

class CategoryController extends BaseController
{
    public function list(array $data, array $vars): ?array
    {
        $this->requireAuth();

        $categories = $this->db->query('SELECT id, code, label, sort_order FROM meal_categories ORDER BY sort_order ASC');
        return $this->jsonResponse(['categories' => $categories], 200);
    }
}
