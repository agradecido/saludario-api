<?php
declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class InitialSchema extends AbstractMigration
{
    public function change(): void
    {
        $users = $this->table('users', ['id' => false, 'primary_key' => 'id']);
        $users->addColumn('id', 'uuid')
              ->addColumn('email', 'string', ['limit' => 255])
              ->addColumn('password_hash', 'string', ['limit' => 255])
              ->addColumn('timezone', 'string', ['default' => 'UTC'])
              ->addColumn('created_at', 'timestamp', ['timezone' => true, 'default' => 'CURRENT_TIMESTAMP'])
              ->addColumn('updated_at', 'timestamp', ['timezone' => true, 'default' => 'CURRENT_TIMESTAMP'])
              ->addColumn('deleted_at', 'timestamp', ['timezone' => true, 'null' => true])
              ->addIndex(['email'], ['unique' => true])
              ->create();

        $mealCategories = $this->table('meal_categories', ['id' => false, 'primary_key' => 'id']);
        $mealCategories->addColumn('id', 'integer', ['identity' => true])
                       ->addColumn('code', 'string', ['limit' => 50])
                       ->addColumn('label', 'string', ['limit' => 100])
                       ->addColumn('sort_order', 'integer', ['default' => 0])
                       ->addIndex(['code'], ['unique' => true])
                       ->create();

        $authSessions = $this->table('auth_sessions', ['id' => false, 'primary_key' => 'id']);
        $authSessions->addColumn('id', 'uuid')
                     ->addColumn('user_id', 'uuid')
                     ->addColumn('session_token_hash', 'string')
                     ->addColumn('expires_at', 'timestamp', ['timezone' => true])
                     ->addColumn('created_at', 'timestamp', ['timezone' => true, 'default' => 'CURRENT_TIMESTAMP'])
                     ->addColumn('revoked_at', 'timestamp', ['timezone' => true, 'null' => true])
                     ->addColumn('ip_hash', 'string', ['null' => true])
                     ->addColumn('user_agent', 'string', ['null' => true])
                     ->addForeignKey('user_id', 'users', 'id', ['delete' => 'CASCADE', 'update' => 'NO_ACTION'])
                     ->addIndex(['user_id'])
                     ->addIndex(['expires_at'])
                     ->create();

        $foodEntries = $this->table('food_entries', ['id' => false, 'primary_key' => 'id']);
        $foodEntries->addColumn('id', 'uuid')
                    ->addColumn('user_id', 'uuid')
                    ->addColumn('meal_category_id', 'integer')
                    ->addColumn('food_name', 'string')
                    ->addColumn('quantity_value', 'decimal', ['precision' => 10, 'scale' => 2, 'null' => true])
                    ->addColumn('quantity_unit', 'string', ['null' => true])
                    ->addColumn('notes', 'text', ['null' => true])
                    ->addColumn('consumed_at', 'timestamp', ['timezone' => true])
                    ->addColumn('created_at', 'timestamp', ['timezone' => true, 'default' => 'CURRENT_TIMESTAMP'])
                    ->addColumn('updated_at', 'timestamp', ['timezone' => true, 'default' => 'CURRENT_TIMESTAMP'])
                    ->addForeignKey('user_id', 'users', 'id', ['delete' => 'CASCADE', 'update' => 'NO_ACTION'])
                    ->addForeignKey('meal_category_id', 'meal_categories', 'id', ['delete' => 'RESTRICT', 'update' => 'NO_ACTION'])
                    ->addIndex(['user_id', 'consumed_at', 'id'], ['name' => 'idx_entries_user_consumed_id'])
                    ->addIndex(['user_id', 'meal_category_id', 'consumed_at', 'id'], ['name' => 'idx_entries_user_cat_consumed_id'])
                    ->create();

        $symptomEvents = $this->table('symptom_events', ['id' => false, 'primary_key' => 'id']);
        $symptomEvents->addColumn('id', 'uuid')
                      ->addColumn('user_id', 'uuid')
                      ->addColumn('symptom_code', 'string')
                      ->addColumn('severity', 'integer', ['default' => 1])
                      ->addColumn('occurred_at', 'timestamp', ['timezone' => true])
                      ->addColumn('notes', 'text', ['null' => true])
                      ->addColumn('created_at', 'timestamp', ['timezone' => true, 'default' => 'CURRENT_TIMESTAMP'])
                      ->addColumn('updated_at', 'timestamp', ['timezone' => true, 'default' => 'CURRENT_TIMESTAMP'])
                      ->addForeignKey('user_id', 'users', 'id', ['delete' => 'CASCADE', 'update' => 'NO_ACTION'])
                      ->addIndex(['user_id', 'occurred_at', 'id'], ['name' => 'idx_symptoms_user_occurred_id'])
                      ->create();
    }
}
