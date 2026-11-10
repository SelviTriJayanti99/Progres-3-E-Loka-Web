<?php
// Jalankan SEKALI di browser (http://localhost/loka-web/setup.php) untuk membuat akun admin, lalu HAPUS file ini.
require __DIR__ . '/api/config.php';
const ADMIN_EMAIL = 'admin@loka.id';
const ADMIN_PASS = 'admin123';
header('Content-Type: text/html; charset=utf-8');
try {
    $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $s = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    $s->execute();
    if ((int)$s->fetchColumn() > 0) {
        $m = 'Akun admin sudah ada, tidak ada yang diubah. Hapus file setup.php ini.';
    } else {
        $pdo->prepare("INSERT INTO users (name, email, phone, password_hash, role) VALUES ('Admin Loka', ?, '081200000000', ?, 'admin')")
            ->execute([ADMIN_EMAIL, password_hash(ADMIN_PASS, PASSWORD_DEFAULT)]);
        $m = 'Admin dibuat. Email: ' . ADMIN_EMAIL . ' | Kata sandi: ' . ADMIN_PASS . '. Segera hapus file setup.php ini.';
    }
} catch (PDOException $e) {
    $m = 'Gagal: pastikan MySQL menyala dan database.sql sudah diimpor di phpMyAdmin. (' . $e->getMessage() . ')';
}
echo '<!DOCTYPE html><meta charset="utf-8"><title>Setup Loka</title><body style="font-family:sans-serif;max-width:560px;margin:60px auto"><p>' . htmlspecialchars($m) . '</p><p><a href="index.html">Ke website</a></p>';
