<?php
require __DIR__ . '/config.php';

date_default_timezone_set('Asia/Makassar');
// Notice/deprecation PHP tidak boleh tercetak ke respons (merusak JSON dan memunculkan error "Unexpected token <").
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
session_start();

function out(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $msg, int $code = 400): void {
    out(['error' => $msg], $code);
}

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            $pdo->exec("SET time_zone = '+08:00'");
        } catch (PDOException $e) {
            $pdo = null;
            fail('Database tidak bisa dihubungi. Pastikan MySQL menyala dan database.sql sudah diimpor.', 500);
        }
    }
    return $pdo;
}

function body(): array {
    $j = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($j) ? $j : [];
}

function public_user(array $u): array {
    return [
        'id' => (int)$u['id'], 'name' => $u['name'], 'email' => $u['email'],
        'phone' => $u['phone'], 'role' => $u['role'], 'created_at' => $u['created_at'],
    ];
}

function current_user(): ?array {
    if (empty($_SESSION['uid'])) return null;
    $s = db()->prepare('SELECT * FROM users WHERE id = ?');
    $s->execute([$_SESSION['uid']]);
    $u = $s->fetch();
    if (!$u) { $_SESSION = []; return null; }
    return $u;
}

function require_login(): array {
    $u = current_user();
    if (!$u) fail('Silakan masuk dulu.', 401);
    return $u;
}

function require_admin(): array {
    $u = require_login();
    if ($u['role'] !== 'admin') fail('Khusus admin.', 403);
    return $u;
}

// Catat riwayat login ke tabel login_history. status: berhasil | gagal | keluar
function log_login(?int $userId, string $email, string $status): void {
    try {
        db()->prepare('INSERT INTO login_history (user_id, email, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)')
            ->execute([
                $userId,
                mb_substr($email, 0, 150),
                $status,
                substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 45),
                mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
            ]);
    } catch (PDOException $e) {
        // Jangan sampai login gagal hanya karena pencatatan riwayat error.
    }
}

function action(): string {
    return (string)($_GET['action'] ?? '');
}
