<?php
declare(strict_types=1);

use Phinx\Seed\AbstractSeed;

class MealCategoriesSeeder extends AbstractSeed
{
    public function run(): void
    {
        $data = [
            [
                'id' => 1,
                'code' => 'breakfast',
                'label' => 'Breakfast',
                'sort_order' => 10,
            ],
            [
                'id' => 2,
                'code' => 'lunch',
                'label' => 'Lunch',
                'sort_order' => 20,
            ],
            [
                'id' => 3,
                'code' => 'dinner',
                'label' => 'Dinner',
                'sort_order' => 30,
            ],
            [
                'id' => 4,
                'code' => 'snack',
                'label' => 'Snack',
                'sort_order' => 40,
            ],
        ];

        $table = $this->table('meal_categories');
        $table->insert($data)
              ->saveData();
    }
}
