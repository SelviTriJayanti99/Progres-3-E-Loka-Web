<?php
require __DIR__ . '/bootstrap.php';

$models = [
    'articles' => ['title' => [150, true], 'category_id' => ['category', false], 'description' => [255, false], 'content' => [20000, true, 'textarea'], 'authors' => [150, true], 'images' => [4096, false, 'images'], 'is_published' => ['checkbox', false]],
    'categories' => ['name' => [100, true], 'description' => [255, false]],
    'pages' => ['title_pages' => [150, true], 'description' => [255, false], 'content' => [20000, true, 'textarea'], 'authors' => [150, true], 'images' => [4096, false, 'images'], 'is_published' => ['checkbox', false]],
    'hero_sections' => ['badge' => [100, false], 'title' => [150, true], 'highlight' => [100, false], 'description' => [255, false], 'image_url' => [255, false, 'image'], 'catalog_label' => [60, true]],
    'web_settings' => ['site_name' => [100, true], 'brand_name' => [60, true], 'tagline' => [100, false], 'description' => [255, false]],
    'networkings' => ['name' => [100, true], 'url' => [255, true, 'url'], 'description' => [255, false], 'is_active' => ['checkbox', false]],
];
$singletons = ['hero_sections', 'web_settings'];

function valid_web_url(string $value): bool {
    return preg_match('#^https?://#i', $value) && filter_var($value, FILTER_VALIDATE_URL);
}

function valid_image_url(string $value): bool {
    return strlen($value) <= 255 && !preg_match('/[\x00-\x1F\x7F]/', $value)
        && (valid_web_url($value)
            || (preg_match('#^img/[^\\\\:%?#<>"\x27]+$#u', $value)
                && !preg_match('#(?:^|/)\.\.?(?:/|$)#', $value)));
}

$action = action();
if ($action !== 'public') {
    require_admin();
}
try {
    if ($action === 'public') {
        $pdo = db();
        out([
            'hero' => $pdo->query('SELECT badge, title, highlight, description, image_url, catalog_label FROM hero_sections WHERE id = 1')->fetch() ?: null,
            'settings' => $pdo->query('SELECT site_name, brand_name, tagline, description FROM web_settings WHERE id = 1')->fetch() ?: null,
            'articles' => $pdo->query('SELECT a.title, a.description, a.content, a.authors, a.images, a.created_at, c.name AS category
                FROM articles a LEFT JOIN categories c ON c.id = a.category_id WHERE a.is_published = 1 ORDER BY a.created_at DESC, a.id DESC')->fetchAll(),
            'pages' => $pdo->query('SELECT title_pages, description, content, authors, images, created_at FROM pages
                WHERE is_published = 1 ORDER BY id')->fetchAll(),
            'networkings' => $pdo->query('SELECT name, url, description FROM networkings WHERE is_active = 1 ORDER BY id')->fetchAll(),
        ]);
    }

    if (!in_array($action, ['list', 'save', 'delete'], true)) fail('Aksi tidak dikenal.', 404);
    $model = $_GET['model'] ?? '';
    if (!is_string($model) || !isset($models[$model])) fail('Model konten tidak dikenal.', 404);
    $singleton = in_array($model, $singletons, true);
    $pdo = db();
    if ($action === 'list') {
        $where = $singleton ? ' WHERE id = 1' : ' ORDER BY id DESC';
        $result = ['rows' => $pdo->query("SELECT * FROM $model$where")->fetchAll()];
        if ($model === 'articles') {
            $result['categories'] = $pdo->query('SELECT id, name FROM categories ORDER BY name')->fetchAll();
        }
        out($result);
    }

    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('Gunakan metode POST.', 405);
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) fail('Kirim data JSON.', 415);
    $data = body();
    $id = filter_var($data['id'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 4294967295]]);
    if ($id === false) fail('ID tidak valid.');
    if ($action === 'delete') {
        if ($singleton) fail('Pengaturan ini hanya bisa diperbarui.');
        $statement = $pdo->prepare("DELETE FROM $model WHERE id = ?");
        $statement->execute([$id]);
        if (!$statement->rowCount()) fail('Data tidak ditemukan.', 404);
        out(['ok' => true]);
    }

    $values = [];
    foreach ($models[$model] as $field => $rules) {
        [$limit, $required] = $rules;
        $type = $rules[2] ?? '';
        $value = $data[$field] ?? '';
        if ($limit === 'checkbox') {
            $values[$field] = !empty($value) ? 1 : 0;
            continue;
        }
        if ($limit === 'category') {
            $category = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 4294967295]]);
            if ($value !== '' && $category === false) fail('Kategori tidak valid.');
            $values[$field] = $category ?: null;
            continue;
        }
        if (!is_string($value)) fail('Format kolom tidak valid.');
        $value = trim($value);
        if (($required && $value === '') || mb_strlen($value) > $limit) {
            fail("Kolom $field belum benar. Batas panjang $limit karakter.");
        }
        if ($type === 'url' && !valid_web_url($value)) fail('Alamat tautan harus berupa URL HTTP atau HTTPS.');
        if ($type === 'image' && $value !== '' && !valid_image_url($value)) fail('Gunakan URL HTTP(S) atau path img/ untuk gambar.');
        if ($type === 'images' && $value !== '') {
            $images = array_filter(array_map('trim', preg_split('/\R/u', $value)), 'strlen');
            foreach ($images as $image) {
                if (!valid_image_url($image)) fail('Gunakan satu URL HTTP(S) atau path img/ yang valid per baris.');
            }
            $value = implode("\n", $images);
        }
        $values[$field] = $value;
    }

    $fields = array_keys($values);
    $columns = implode(', ', $fields);
    $placeholders = implode(', ', array_fill(0, count($fields), '?'));
    $params = array_values($values);
    if ($singleton) {
        $updates = implode(', ', array_map(static function ($field) { return "$field = VALUES($field)"; }, $fields));
        $pdo->prepare("INSERT INTO $model (id, $columns) VALUES (1, $placeholders) ON DUPLICATE KEY UPDATE $updates")->execute($params);
    } elseif ($id) {
        $updates = implode(' = ?, ', $fields) . ' = ?';
        $statement = $pdo->prepare("UPDATE $model SET $updates WHERE id = ?");
        $statement->execute(array_merge($params, [$id]));
        if (!$statement->rowCount()) {
            $exists = $pdo->prepare("SELECT id FROM $model WHERE id = ?");
            $exists->execute([$id]);
            if (!$exists->fetchColumn()) fail('Data tidak ditemukan.', 404);
        }
    } else {
        $pdo->prepare("INSERT INTO $model ($columns) VALUES ($placeholders)")->execute($params);
    }
    out(['ok' => true]);
} catch (PDOException $e) {
    $error = (int)($e->errorInfo[1] ?? 0);
    if ($error === 1062) fail('Nama kategori sudah digunakan.', 409);
    if ($error === 1452) fail('Kategori sudah tidak tersedia. Muat ulang daftar kategori.', 409);
    if ($error === 1146) fail('Impor cms-upgrade.sql untuk mengaktifkan modul konten.', 503);
    error_log($e->getMessage());
    fail('Data konten tidak dapat diproses.', 500);
}
