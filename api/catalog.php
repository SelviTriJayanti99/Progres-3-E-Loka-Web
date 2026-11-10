<?php
// Katalog publik: menu dan boardgame tidak membutuhkan login.
require __DIR__ . '/bootstrap.php';

try {
    switch (action()) {
        case 'games':
            out(['games' => db()->query('SELECT id, title, genre, min_players, max_players, duration, difficulty, description, is_available, image_url FROM games WHERE is_active = 1 ORDER BY title')->fetchAll()]);
        case 'menu':
            out(['menu' => db()->query('SELECT id, name, price, category, description, image_url FROM menu WHERE is_active = 1 ORDER BY name')->fetchAll()]);
        default:
            fail('Aksi katalog tidak dikenal.', 404);
    }
} catch (PDOException $e) {
    error_log('Loka catalog: ' . $e->getMessage());
    fail('Katalog belum siap. Jalankan migrate.php sekali agar tabel dan foto katalog diperbarui.', 503);
}
