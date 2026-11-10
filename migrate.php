<?php
// Jalankan SEKALI di browser (http://localhost/loka-web/migrate.php) kalau database lama sudah pernah diimpor.
// Menambah kolom kategori, deskripsi, dan foto pada tabel menu, lalu melengkapi menu awal. Aman dijalankan berulang.
// Setelah selesai, HAPUS file ini.
require __DIR__ . '/api/config.php';
header('Content-Type: text/html; charset=utf-8');

$items = [
    ['Bakso Loka', 25000, 'Makanan', 'Bakso sapi kenyal dengan mie, bihun, dan kuah kaldu hangat.'],
    ['Mie Ayam Bakso', 27000, 'Makanan', 'Mie ayam dengan topping bakso dan pangsit goreng.'],
    ['Nasi Goreng Spesial', 28000, 'Makanan', 'Nasi goreng dengan telur, ayam suwir, dan acar.'],
    ['Mie Goreng Loka', 28000, 'Makanan', 'Mie goreng bumbu rumahan dengan telur dan sayuran.'],
    ['Chicken Katsu Rice', 32000, 'Makanan', 'Ayam katsu renyah dengan nasi hangat dan saus spesial.'],
    ['Kopi Susu Loka', 22000, 'Minuman', 'Kopi susu andalan Loka, pas menemani sesi main panjang.'],
    ['Matcha Latte', 25000, 'Minuman', 'Matcha creamy dengan susu, disajikan dingin atau hangat.'],
    ['Cappuccino', 24000, 'Minuman', 'Espresso dengan susu berbusa yang lembut.'],
    ['Es Teh Manis', 8000, 'Minuman', 'Teh dingin manis yang menyegarkan.'],
    ['Es Teh Lemon', 15000, 'Minuman', 'Teh dingin dengan perasan lemon segar.'],
    ['Es Jeruk', 12000, 'Minuman', 'Jeruk peras dengan es batu.'],
    ['Kentang Goreng', 20000, 'Cemilan', 'Kentang goreng renyah, enak dimakan sambil main.'],
    ['Roti Bakar Coklat', 18000, 'Cemilan', 'Roti bakar tebal dengan selai coklat.'],
    ['Pisang Goreng', 15000, 'Cemilan', 'Pisang goreng yang renyah di luar, lembut di dalam.'],
    ['Tahu Crispy', 16000, 'Cemilan', 'Tahu goreng tepung renyah dengan sambal.']
];

$photos = [
    'Bakso Loka' => 'img/Bakso Loka.jpeg',
    'Mie Ayam Bakso' => 'img/Mie ayam loka.jpg',
    'Nasi Goreng Spesial' => 'img/Nasi Goreng Loka spesial.jpg',
    'Mie Goreng Loka' => 'img/Mie Goreng Loka.jpg',
    'Chicken Katsu Rice' => 'img/chicken katsu loka.jpg',
    'Kopi Susu Loka' => 'img/Kopi susu loka.jpg',
    'Matcha Latte' => 'img/matcha latte.jpg',
    'Cappuccino' => 'img/capuccino loka.jpg',
    'Es Teh Manis' => 'img/es teh manis.jpg',
    'Es Teh Lemon' => 'img/es teh lemon.jpg',
    'Es Jeruk' => 'img/es jeruk.jpg',
    'Kentang Goreng' => 'img/Kentang Goreng.jpg',
    'Roti Bakar Coklat' => 'img/Roti bakar coklat.jpeg',
    'Pisang Goreng' => 'img/Pisang Goreng Sambal.jpg',
    'Tahu Crispy' => 'img/Tahu Crispy.jpeg',
];

try {
    $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $has = function (string $col) use ($pdo): bool {
        $s = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'menu' AND COLUMN_NAME = ?");
        $s->execute([DB_NAME, $col]);
        return (int)$s->fetchColumn() > 0;
    };
    if (!$has('category')) $pdo->exec("ALTER TABLE menu ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT 'Makanan' AFTER price");
    if (!$has('description')) $pdo->exec("ALTER TABLE menu ADD COLUMN description VARCHAR(200) NOT NULL DEFAULT '' AFTER category");
    if (!$has('image_url')) $pdo->exec("ALTER TABLE menu ADD COLUMN image_url VARCHAR(255) NOT NULL DEFAULT '' AFTER description");

    $upd = $pdo->prepare("UPDATE menu SET category = ?, description = ? WHERE name = ? AND description = ''");
    $ins = $pdo->prepare("INSERT INTO menu (name, price, category, description) SELECT ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menu WHERE name = ?)");
    $added = 0;
    foreach ($items as [$name, $price, $cat, $desc]) {
        $upd->execute([$cat, $desc, $name]);
        $ins->execute([$name, $price, $cat, $desc, $name]);
        $added += $ins->rowCount();
    }
    $pic = $pdo->prepare("UPDATE menu SET image_url = ? WHERE name = ? AND image_url = ''");
    foreach ($photos as $n => $f) $pic->execute([$f, $n]);
    // Tambah foto boardgame untuk database lama tanpa menghapus konten yang sudah dibuat.
    $gameCol = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'games' AND COLUMN_NAME = 'image_url'");
    $gameCol->execute([DB_NAME]);
    if (!(int)$gameCol->fetchColumn()) {
        $pdo->exec("ALTER TABLE games ADD COLUMN image_url VARCHAR(255) NOT NULL DEFAULT '' AFTER description");
    }
    $gamePhotos = [
        'Catan' => 'img/catan game.jpg',
        'Ticket to Ride' => 'img/Ticket to Ride game.jpeg',
        'Carcassonne' => 'img/Carcassonne game.jpeg',
        'Pandemic' => 'img/Pandemic game.jpg',
        'Forbidden Island' => 'img/Forbidden Island game.jpg',
        'Codenames' => 'img/codenames game.jpeg',
        'Dixit' => 'img/Dixit game.jpeg',
        'Exploding Kittens' => 'img/Exploding Kittens game.jpg',
        'Splendor' => 'img/splendor game.jpeg',
        'Azul' => 'img/azul game.jpeg',
        '7 Wonders' => 'img/7 wonders game.jpeg',
        'Terraforming Mars' => 'img/Terraforming Mars game.jpg',
    ];
    $updGame = $pdo->prepare("UPDATE games SET image_url = ? WHERE title = ? AND (image_url = '' OR image_url IS NULL)");
    foreach ($gamePhotos as $name => $path) $updGame->execute([$path, $name]);

    // Perbaikan foto khusus Exploding Kittens: file memakai nama tanpa spasi
    // sehingga URL aman, termasuk bila path lama database tidak cocok.
    $pdo->prepare("UPDATE games SET image_url = ? WHERE LOWER(title) LIKE ?")->execute(['img/exploding-kittens.jpg', '%exploding kittens%']);
    $orderCol = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'selected_game_id'");
    $orderCol->execute([DB_NAME]);
    if (!(int)$orderCol->fetchColumn()) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN selected_game_id INT UNSIGNED NULL AFTER menu_id");
        $pdo->exec("ALTER TABLE orders ADD INDEX idx_selected_game_id (selected_game_id)");
    }
    // V6: Simpan nama game dalam tabel orders, bukan hanya ID. Aman diulang.
    $nameCol = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'selected_game_name'");
    $nameCol->execute([DB_NAME]);
    if (!(int)$nameCol->fetchColumn()) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN selected_game_name VARCHAR(100) NULL AFTER selected_game_id");
    }
    // Isi nama untuk pesanan yang sudah ada; jangan timpa nama yang telah tersimpan.
    $pdo->exec("UPDATE orders o LEFT JOIN games g ON g.id = o.selected_game_id SET o.selected_game_name = g.title WHERE o.selected_game_id IS NOT NULL AND (o.selected_game_name IS NULL OR o.selected_game_name = '') AND g.title IS NOT NULL");
    // V9: tautkan setiap pesanan menu dengan booking meja pada satu checkout.
    $bookingLink = $pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'booking_id'");
    if (!(int)$bookingLink->fetchColumn()) $pdo->exec("ALTER TABLE orders ADD COLUMN booking_id INT UNSIGNED NULL AFTER selected_game_name");
    $bookingIdx = $pdo->query("SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_order_booking'");
    if (!(int)$bookingIdx->fetchColumn()) $pdo->exec("ALTER TABLE orders ADD INDEX idx_order_booking (booking_id)");
    // Pasang skema CMS bila belum diimpor (CREATE TABLE IF NOT EXISTS, tanpa reset data).
    $cmsSql = file_get_contents(__DIR__ . '/cms-upgrade.sql');
    foreach (explode(';', $cmsSql) as $statement) {
        $statement = preg_replace('/^\s*--[^\n]*$/m', '', $statement);
        if (trim($statement) !== '' && !preg_match('/^\s*USE\s+/i', $statement)) $pdo->exec($statement);
    }
    // Contoh konten Progres III: hanya isi tabel yang MASIH KOSONG.
    // Data yang sudah ditambahkan admin tidak diubah / ditimpa.
    if ((int)$pdo->query('SELECT COUNT(*) FROM categories')->fetchColumn() === 0) {
        $insCat = $pdo->prepare('INSERT INTO categories (name,description) VALUES (?,?)');
        foreach ([
            ['Boardgame', 'Panduan dan rekomendasi permainan papan.'],
            ['Tips & Lifestyle', 'Ide quality time dan aktivitas bersama teman.'],
            ['Kuliner', 'Inspirasi makanan dan minuman untuk teman bermain.'],
            ['Kabar Loka', 'Informasi dan cerita dari Loka Boardgame Cafe.']
        ] as $cat) $insCat->execute($cat);
    }
    if ((int)$pdo->query('SELECT COUNT(*) FROM articles')->fetchColumn() === 0) {
        $insArticle = $pdo->prepare('INSERT INTO articles (title,category_id,description,content,authors,images,is_published) VALUES (?,(SELECT id FROM categories WHERE name = ? LIMIT 1),?,?,?,?,1)');
        foreach ([
            [
                'Lebih dari Sekadar Nongkrong: Serunya Bermain di Loka', 'Tips & Lifestyle',
                'Nongkrong terasa lebih seru ketika ada permainan, cerita, dan makanan favorit.',
                "Ingin mencoba cara baru menikmati waktu bersama teman? Boardgame menawarkan interaksi langsung, tawa, dan tantangan yang menyenangkan.\n\nDi Loka Boardgame Cafe, kamu bisa menjelajahi katalog permainan dan memilih permainan yang cocok dengan jumlah pemain. Sambil bermain, lengkapi waktu berkumpul dengan makanan dan minuman pilihan.\n\nLihat koleksi game dan menu melalui website, lalu gunakan fitur booking untuk merencanakan kunjunganmu. Makan, minum, main bersama!",
                'Tim Loka', 'img/catan game.jpg'
            ],
            [
                'Rekomendasi Boardgame untuk Pemula', 'Boardgame',
                'Mulai dari game yang mudah dipelajari dan cocok dimainkan bersama teman.',
                "Baru pertama kali mencoba boardgame? Pilih permainan dengan aturan sederhana terlebih dahulu. Game kartu dan permainan keluarga biasanya cocok untuk memulai.\n\nCatan mengajak pemain mengelola sumber daya dan bernegosiasi. Ticket to Ride mengutamakan perencanaan rute. Dixit mengajak pemain bercerita dan menebak ilustrasi.\n\nPeriksa informasi jumlah pemain dan durasi pada katalog website Loka sebelum memilih game.",
                'Tim Loka', 'img/Ticket to Ride game.jpeg'
            ],
            [
                'Makanan dan Minuman untuk Teman Main', 'Kuliner',
                'Biar sesi boardgame makin nyaman, pilih camilan dan minuman favoritmu.',
                "Bermain boardgame bersama teman akan lebih menyenangkan dengan teman ngemil. Kamu bisa menjelajahi pilihan makanan, minuman, dan camilan yang tersedia melalui katalog menu.\n\nGunakan informasi menu di website untuk menentukan pesanan sebelum atau saat berkumpul. Nikmati permainan dan kebersamaan dengan lebih santai.",
                'Tim Loka', 'img/Kopi susu loka.jpg'
            ],
        ] as $article) $insArticle->execute($article);
    }
    if ((int)$pdo->query('SELECT COUNT(*) FROM pages')->fetchColumn() === 0) {
        $insPage = $pdo->prepare('INSERT INTO pages (title_pages,description,content,authors,images,is_published) VALUES (?,?,?,?,?,1)');
        foreach ([
            ['Tentang Loka', 'Kenalan dengan konsep Loka Boardgame Cafe.', "Loka Boardgame Cafe menggabungkan pengalaman berkumpul di kafe dengan permainan boardgame. Jelajahi pilihan game dan menu melalui website kami.\n\nWebsite ini juga mendukung pemesanan dan booking untuk membantu pengunjung merencanakan kunjungan.", 'Tim Loka', 'img/Dixit game.jpeg'],
            ['Panduan Booking', 'Cara menggunakan fitur booking meja melalui website.', "1. Buat akun atau masuk ke website Loka.\n2. Pilih fitur booking meja.\n3. Lengkapi informasi pemesanan yang diminta.\n4. Periksa kembali detail booking dan simpan konfirmasinya.\n\nJika perlu bantuan, hubungi Loka melalui jejaring sosial resmi.", 'Tim Loka', ''],
            ['Panduan Memilih Boardgame', 'Temukan permainan sesuai kebutuhan kelompokmu.', "Periksa jumlah pemain, durasi, genre, dan tingkat kesulitan yang tercantum di katalog. Gunakan pencarian atau filter untuk mempersempit pilihan.\n\nUntuk sesi pertama, mulai dari permainan yang aturannya mudah dipahami.", 'Tim Loka', 'img/Carcassonne game.jpeg'],
        ] as $page) $insPage->execute($page);
    }
    // Tambah halaman informatif meskipun tabel Pages sudah berisi konten.
    $guideExists = $pdo->query("SELECT COUNT(*) FROM pages WHERE title_pages = 'Informasi Pengunjung Loka'")->fetchColumn();
    if (!(int)$guideExists) {
        $pdo->prepare('INSERT INTO pages (title_pages,description,content,authors,images,is_published) VALUES (?,?,?,?,?,1)')->execute([
            'Informasi Pengunjung Loka',
            'Panduan memilih boardgame, memesan menu, dan booking meja.',
            "Selamat datang di Loka Boardgame Cafe!\n\nCara memesan: buka katalog boardgame, pilih game yang tersedia, kemudian login dan tentukan game pada langkah pertama pemesanan. Pada langkah kedua, pilih makanan atau minuman favorit dan kirim pesanan.\n\nUntuk booking meja, masuk ke akun pelanggan, pilih Booking Meja, kemudian tentukan tanggal, jam, dan jumlah pengunjung. Cek informasi terbaru dan pertanyaan lebih lanjut melalui Instagram resmi @lokaboardgamecafe.\n\nPilihan game pada pesanan menu tidak otomatis berarti booking meja atau pembayaran biaya sewa game. Konfirmasi ketersediaan dan ketentuannya langsung kepada staf Loka.",
            'Tim Loka', 'img/Dixit game.jpeg'
        ]);
    }
    if ((int)$pdo->query('SELECT COUNT(*) FROM networkings')->fetchColumn() === 0) {
        $pdo->prepare('INSERT INTO networkings (name,url,description,is_active) VALUES (?,?,?,1)')->execute([
            'Instagram Loka Boardgame Cafe',
            'https://www.instagram.com/lokaboardgamecafe?dlrf=b3U1ZXlpZGo1Ymc0',
            'Ikuti kabar dan informasi Loka di Instagram.'
        ]);
    }
    $check = $pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'selected_game_id'");
    if (!(int)$check->fetchColumn()) throw new RuntimeException('Kolom selected_game_id belum tersedia setelah migrasi.');
    $checkName = $pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'selected_game_name'");
    if (!(int)$checkName->fetchColumn()) throw new RuntimeException('Kolom selected_game_name belum tersedia setelah migrasi.');
    $m = 'Upgrade V9 berhasil: booking dan menu sudah dapat ditautkan dengan booking_id. Upgrade V6 sebelumnya: selected_game_id dan selected_game_name tersedia; nama game pesanan lama dilengkapi. CMS dan katalog siap digunakan. Menu awal tambahan: ' . $added . '. Hapus migrate.php setelah selesai.';
} catch (Throwable $e) {
    $m = 'Gagal: pastikan MySQL menyala dan database.sql sudah diimpor. (' . $e->getMessage() . ')';
}
echo '<!DOCTYPE html><meta charset="utf-8"><title>Migrasi Loka</title><body style="font-family:sans-serif;max-width:560px;margin:60px auto"><p>' . htmlspecialchars($m) . '</p><p><a href="index.html">Ke website</a></p>';
