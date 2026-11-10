<?php
require __DIR__ . '/bootstrap.php';

switch (action()) {
    case 'me':
        $u = current_user();
        out(['user' => $u ? public_user($u) : null]);

    case 'register':
        $d = body();
        $name = trim((string)($d['name'] ?? ''));
        $email = strtolower(trim((string)($d['email'] ?? '')));
        $phone = trim((string)($d['phone'] ?? ''));
        $pass = (string)($d['password'] ?? '');
        if ($name === '' || $email === '' || $phone === '' || $pass === '') fail('Lengkapi semua kolom.');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Format email belum benar.');
        if (!preg_match('/^[0-9+][0-9\s-]{8,15}$/', $phone)) fail('Nomor WhatsApp belum benar.');
        if (strlen($pass) < 6) fail('Kata sandi minimal 6 karakter.');
        if (mb_strlen($name) > 100) fail('Nama terlalu panjang.');

        $s = db()->prepare('SELECT id FROM users WHERE email = ?');
        $s->execute([$email]);
        if ($s->fetch()) fail('Email sudah terdaftar.', 409);

        db()->prepare("INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'user')")
            ->execute([$name, $email, $phone, password_hash($pass, PASSWORD_DEFAULT)]);
        $id = (int)db()->lastInsertId();
        session_regenerate_id(true);
        $_SESSION['uid'] = $id;
        log_login($id, $email, 'berhasil');
        out(['user' => public_user(current_user())]);

    case 'login':
        $d = body();
        $email = strtolower(trim((string)($d['email'] ?? '')));
        $pass = (string)($d['password'] ?? '');
        if ($email === '' || $pass === '') fail('Isi email dan kata sandi.');

        $s = db()->prepare('SELECT * FROM users WHERE email = ?');
        $s->execute([$email]);
        $u = $s->fetch();
        if (!$u || !password_verify($pass, $u['password_hash'])) {
            log_login($u ? (int)$u['id'] : null, $email, 'gagal');
            fail('Email atau kata sandi salah.', 401);
        }
        session_regenerate_id(true);
        $_SESSION['uid'] = (int)$u['id'];
        log_login((int)$u['id'], $email, 'berhasil');
        out(['user' => public_user($u)]);

    case 'logout':
        $u = current_user();
        if ($u) log_login((int)$u['id'], $u['email'], 'keluar');
        $_SESSION = [];
        session_destroy();
        out(['ok' => true]);

    default:
        fail('Aksi tidak dikenal.', 404);
}
