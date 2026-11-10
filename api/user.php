<?php
require __DIR__ . '/bootstrap.php';
$u = require_login();
$uid = (int)$u['id'];

switch (action()) {
    case 'menu':
        try {
            $r = db()->query('SELECT id, name, price, category, description, image_url FROM menu WHERE is_active = 1 ORDER BY name')->fetchAll();
        } catch (PDOException $e) {
            fail('Tabel menu perlu diperbarui. Buka migrate.php sekali di browser.', 500);
        }
        out(['menu' => $r]);

    case 'history':
        // Kompatibel dengan database V2 yang belum memiliki selected_game_id.
        $col = db()->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'selected_game_id'");
        $col->execute();
        $hasBookingLink = (int)db()->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'booking_id'")->fetchColumn() > 0;
        if ((int)$col->fetchColumn() > 0) {
            $hasName = db()->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'selected_game_name'")->fetchColumn();
            $gameLabel = $hasName ? "COALESCE(NULLIF(o.selected_game_name, ''), g.title)" : 'g.title';
            $o = db()->prepare('SELECT o.id, o.item_name, o.qty, o.total, o.status, o.created_at, ' . ($hasBookingLink ? 'o.booking_id' : 'NULL AS booking_id') . ', ' . $gameLabel . ' AS game_title FROM orders o LEFT JOIN games g ON g.id = o.selected_game_id WHERE o.user_id = ? ORDER BY o.created_at DESC, o.id DESC');
        } else {
            $o = db()->prepare('SELECT o.id, o.item_name, o.qty, o.total, o.status, o.created_at, NULL AS booking_id, NULL AS game_title FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC, o.id DESC');
        }
        $o->execute([$uid]);
        $b = db()->prepare('SELECT b.id, b.booking_date, b.booking_time, b.people, b.status, b.created_at, ' . ($hasBookingLink ? '(SELECT COUNT(*) FROM orders o WHERE o.booking_id = b.id)' : '0') . ' AS order_count FROM bookings b WHERE b.user_id = ? ORDER BY b.created_at DESC, b.id DESC');
        $b->execute([$uid]);
        out(['orders' => $o->fetchAll(), 'bookings' => $b->fetchAll()]);

    case 'order':
        $d = body();
        $menuId = (int)($d['menu_id'] ?? 0);
        $qty = (int)($d['qty'] ?? 0);
        if ($qty < 1 || $qty > 50) fail('Jumlah harus 1-50.');
        $s = db()->prepare('SELECT id, name, price FROM menu WHERE id = ? AND is_active = 1');
        $s->execute([$menuId]);
        $m = $s->fetch();
        if (!$m) fail('Menu tidak tersedia.', 404);
        $total = (int)$m['price'] * $qty;
        db()->prepare('INSERT INTO orders (user_id, menu_id, item_name, qty, total) VALUES (?, ?, ?, ?, ?)')
            ->execute([$uid, $m['id'], $m['name'], $qty, $total]);
        out(['qty' => $qty, 'item' => $m['name'], 'total' => $total]);

    case 'order_batch':
        $d = body();
        $items = $d['items'] ?? [];
        if (!is_array($items) || !$items || count($items) > 30) fail('Keranjang kosong atau terlalu banyak item.');
        // Client hanya mengirim ID game. Nama asli selalu diambil dari database,
        // sehingga selected_game_name benar-benar tersimpan sebagai teks di orders.
        $selectedGame = (int)($d['game_id'] ?? 0);
        $selectedGameName = null;
        if ($selectedGame) {
            $gameStmt = db()->prepare('SELECT title FROM games WHERE id = ? AND is_active = 1 AND is_available = 1');
            $gameStmt->execute([$selectedGame]);
            $selectedGameName = $gameStmt->fetchColumn();
            if ($selectedGameName === false) fail('Boardgame yang dipilih tidak tersedia. Pilih game lain.', 409);
            $selectedGameName = trim((string)$selectedGameName);
            if ($selectedGameName === '') fail('Nama boardgame belum diisi oleh admin.', 409);
        }
        $merged = [];
        foreach ($items as $it) {
            $id = (int)($it['menu_id'] ?? 0);
            $q = (int)($it['qty'] ?? 0);
            if ($q < 1 || $q > 50) fail('Jumlah tiap menu harus 1-50.');
            $merged[$id] = min(50, ($merged[$id] ?? 0) + $q);
        }
        $pdo = db();
        // Check schema before preparing INSERT: older installations don't have this column.
        $schema = $pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'selected_game_id'");
        if (!(int)$schema->fetchColumn()) {
            fail('Database pemesanan belum diperbarui. Admin perlu menjalankan migrate.php atau mengimpor UPDATE-SQL-PEMESANAN-GAME.sql.', 409);
        }
        $nameCol = $pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'selected_game_name'");
        if (!(int)$nameCol->fetchColumn()) {
            fail('Database belum memiliki kolom selected_game_name. Jalankan migrate.php V6 atau impor UPDATE-SQL-V6-NAMA-GAME.sql terlebih dahulu.', 409);
        }
        $sel = $pdo->prepare('SELECT id, name, price FROM menu WHERE id = ? AND is_active = 1');
        $ins = $pdo->prepare('INSERT INTO orders (user_id, menu_id, item_name, qty, total, selected_game_id, selected_game_name) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $grand = 0;
        $savedIds = [];
        $pdo->beginTransaction();
        try {
            foreach ($merged as $id => $q) {
                $sel->execute([$id]);
                $m = $sel->fetch();
                if (!$m) throw new RuntimeException('Ada menu yang sudah tidak tersedia. Muat ulang halaman.');
                $total = (int)$m['price'] * $q;
                $ins->execute([$uid, $m['id'], $m['name'], $q, $total, $selectedGame ?: null, $selectedGameName]);
                $savedIds[] = (int)$pdo->lastInsertId();
                $grand += $total;
            }
            // Verifikasi data yang benar-benar tersimpan, bukan hanya pilihan di browser.
            $verify = $pdo->prepare('SELECT selected_game_name FROM orders WHERE id = ? AND user_id = ?');
            foreach ($savedIds as $savedId) {
                $verify->execute([$savedId, $uid]);
                $savedName = $verify->fetchColumn();
                if ($selectedGameName !== null && $savedName !== $selectedGameName) {
                    throw new RuntimeException('Nama boardgame belum berhasil tersimpan. Pesanan dibatalkan.');
                }
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            if ($e instanceof RuntimeException) fail($e->getMessage(), 409);
            error_log('Loka order_batch database error: ' . $e->getMessage());
            fail('Pesanan gagal disimpan oleh server. Periksa XAMPP Apache error.log dan struktur tabel orders.', 500);
        }
        out(['items' => count($merged), 'total' => $grand, 'game_name' => $selectedGameName, 'selected_game_name' => $selectedGameName, 'order_ids' => $savedIds]);

    case 'checkout':
        $d = body();
        $date = (string)($d['date'] ?? '');
        $time = (string)($d['time'] ?? '');
        $people = (int)($d['people'] ?? 0);
        $dt = DateTime::createFromFormat('!Y-m-d', $date);
        if (!$dt || $dt->format('Y-m-d') !== $date || $date < (new DateTimeImmutable('now', new DateTimeZone('Asia/Makassar')))->format('Y-m-d')) fail('Pilih tanggal booking hari ini atau setelahnya.');
        if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time)) fail('Jam booking tidak valid.');
        if ($people < 1 || $people > 12) fail('Jumlah tamu harus 1 sampai 12 orang.');
        $items = $d['items'] ?? [];
        if (!is_array($items) || !$items || count($items) > 30) fail('Keranjang kosong atau terlalu banyak item.');
        // Client hanya mengirim ID game. Nama asli selalu diambil dari database,
        // sehingga selected_game_name benar-benar tersimpan sebagai teks di orders.
        $selectedGame = (int)($d['game_id'] ?? 0);
        $selectedGameName = null;
        if ($selectedGame) {
            $gameStmt = db()->prepare('SELECT title FROM games WHERE id = ? AND is_active = 1 AND is_available = 1');
            $gameStmt->execute([$selectedGame]);
            $selectedGameName = $gameStmt->fetchColumn();
            if ($selectedGameName === false) fail('Boardgame yang dipilih tidak tersedia. Pilih game lain.', 409);
            $selectedGameName = trim((string)$selectedGameName);
            if ($selectedGameName === '') fail('Nama boardgame belum diisi oleh admin.', 409);
        }
        $merged = [];
        foreach ($items as $it) {
            $id = (int)($it['menu_id'] ?? 0);
            $q = (int)($it['qty'] ?? 0);
            if ($q < 1 || $q > 50) fail('Jumlah tiap menu harus 1-50.');
            $merged[$id] = min(50, ($merged[$id] ?? 0) + $q);
        }
        $pdo = db();
        // Check schema before preparing INSERT: older installations don't have this column.
        $schema = $pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'selected_game_id'");
        if (!(int)$schema->fetchColumn()) {
            fail('Database pemesanan belum diperbarui. Admin perlu menjalankan migrate.php atau mengimpor UPDATE-SQL-PEMESANAN-GAME.sql.', 409);
        }
        $nameCol = $pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'selected_game_name'");
        if (!(int)$nameCol->fetchColumn()) {
            fail('Database belum memiliki kolom selected_game_name. Jalankan migrate.php V6 atau impor UPDATE-SQL-V6-NAMA-GAME.sql terlebih dahulu.', 409);
        }
        $linkCol = $pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'booking_id'");
        if (!(int)$linkCol->fetchColumn()) fail('Database checkout belum diperbarui. Jalankan UPDATE-SQL-V9-CHECKOUT.sql.', 409);
        $sel = $pdo->prepare('SELECT id, name, price FROM menu WHERE id = ? AND is_active = 1');
        $ins = $pdo->prepare('INSERT INTO orders (user_id, menu_id, item_name, qty, total, selected_game_id, selected_game_name, booking_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $grand = 0;
        $savedIds = [];
        $pdo->beginTransaction();
        try {
            $bookingStmt = $pdo->prepare('INSERT INTO bookings (user_id, booking_date, booking_time, people) VALUES (?, ?, ?, ?)');
            $bookingStmt->execute([$uid, $date, $time . ':00', $people]);
            $bookingId = (int)$pdo->lastInsertId();
            foreach ($merged as $id => $q) {
                $sel->execute([$id]);
                $m = $sel->fetch();
                if (!$m) throw new RuntimeException('Ada menu yang sudah tidak tersedia. Muat ulang halaman.');
                $total = (int)$m['price'] * $q;
                $ins->execute([$uid, $m['id'], $m['name'], $q, $total, $selectedGame ?: null, $selectedGameName, $bookingId]);
                $savedIds[] = (int)$pdo->lastInsertId();
                $grand += $total;
            }
            // Verifikasi data yang benar-benar tersimpan, bukan hanya pilihan di browser.
            $verify = $pdo->prepare('SELECT selected_game_name FROM orders WHERE id = ? AND user_id = ?');
            foreach ($savedIds as $savedId) {
                $verify->execute([$savedId, $uid]);
                $savedName = $verify->fetchColumn();
                if ($selectedGameName !== null && $savedName !== $selectedGameName) {
                    throw new RuntimeException('Nama boardgame belum berhasil tersimpan. Pesanan dibatalkan.');
                }
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            if ($e instanceof RuntimeException) fail($e->getMessage(), 409);
            error_log('Loka checkout database error: ' . $e->getMessage());
            fail('Pesanan gagal disimpan oleh server. Periksa XAMPP Apache error.log dan struktur tabel orders.', 500);
        }
        out(['booking_id' => $bookingId, 'booking_date' => $date, 'booking_time' => $time, 'people' => $people, 'booking_status' => 'menunggu', 'items' => count($merged), 'total' => $grand, 'game_name' => $selectedGameName, 'selected_game_name' => $selectedGameName, 'order_ids' => $savedIds]);

    case 'booking':
        $d = body();
        $date = (string)($d['date'] ?? '');
        $time = (string)($d['time'] ?? '');
        $people = (int)($d['people'] ?? 0);
        $dt = DateTime::createFromFormat('Y-m-d', $date);
        if (!$dt || $dt->format('Y-m-d') !== $date) fail('Tanggal tidak valid.');
        if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time)) fail('Jam tidak valid.');
        if ($people < 1 || $people > 12) fail('Jumlah orang harus 1-12.');
        if ($date < (new DateTimeImmutable('now', new DateTimeZone('Asia/Makassar')))->format('Y-m-d')) fail('Tanggal booking tidak boleh kemarin.');
        db()->prepare('INSERT INTO bookings (user_id, booking_date, booking_time, people) VALUES (?, ?, ?, ?)')
            ->execute([$uid, $date, $time . ':00', $people]);
        out(['people' => $people, 'date' => $date, 'time' => $time]);

    case 'cancel':
        $d = body();
        $id = (int)($d['id'] ?? 0);
        if (($d['type'] ?? '') === 'order') {
            $s = db()->prepare("UPDATE orders SET status = 'dibatalkan' WHERE id = ? AND user_id = ? AND status = 'baru'");
        } elseif (($d['type'] ?? '') === 'booking') {
            // Booking dan menu terhubung: batalkan semua pesanan yang belum diproses bersama booking.
            $pdo = db();
            $pdo->beginTransaction();
            try {
                $s = $pdo->prepare("UPDATE bookings SET status = 'dibatalkan' WHERE id = ? AND user_id = ? AND status = 'menunggu'");
                $s->execute([$id, $uid]);
                if (!$s->rowCount()) { $pdo->rollBack(); fail('Booking tidak dapat dibatalkan.', 409); }
                $linked = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'booking_id'");
                $linked->execute();
                if ((int)$linked->fetchColumn()) {
                    // Jangan batalkan booking bila sebagian pesanannya sudah diproses.
                    $pending = $pdo->prepare("SELECT COUNT(*) FROM orders WHERE booking_id = ? AND status IN ('diproses','selesai')");
                    $pending->execute([$id]);
                    if ((int)$pending->fetchColumn() > 0) { $pdo->rollBack(); fail('Pesanan sudah diproses. Hubungi staf untuk perubahan booking.', 409); }
                    $pdo->prepare("UPDATE orders SET status = 'dibatalkan' WHERE booking_id = ? AND user_id = ? AND status = 'baru'")->execute([$id, $uid]);
                }
                $pdo->commit();
                out(['ok' => true]);
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
        } else {
            fail('Jenis tidak dikenal.');
        }
        $s->execute([$id, $uid]);
        if (!$s->rowCount()) fail('Tidak bisa dibatalkan (sudah diproses atau bukan milik kamu).', 409);
        out(['ok' => true]);

    case 'profile':
        $d = body();
        $name = trim((string)($d['name'] ?? ''));
        $phone = trim((string)($d['phone'] ?? ''));
        if ($name === '' || $phone === '') fail('Nama dan nomor tidak boleh kosong.');
        if (mb_strlen($name) > 100) fail('Nama terlalu panjang.');
        if (!preg_match('/^[0-9+][0-9\s-]{8,15}$/', $phone)) fail('Nomor WhatsApp belum benar.');
        db()->prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?')->execute([$name, $phone, $uid]);
        out(['user' => public_user(current_user())]);

    default:
        fail('Aksi tidak dikenal.', 404);
}
