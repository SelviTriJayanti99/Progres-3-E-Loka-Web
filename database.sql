-- Loka Boardgame Cafe - database MySQL/MariaDB
-- Cara pakai: phpMyAdmin > tab "Import" > pilih file ini > Go
CREATE DATABASE IF NOT EXISTS loka_cafe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE loka_cafe;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price INT UNSIGNED NOT NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'Makanan',
  description VARCHAR(200) NOT NULL DEFAULT '',
  image_url VARCHAR(255) NOT NULL DEFAULT '',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  menu_id INT UNSIGNED NULL,
  selected_game_id INT UNSIGNED NULL,
  selected_game_name VARCHAR(100) NULL,
  booking_id INT UNSIGNED NULL,
  INDEX idx_order_booking (booking_id),
  item_name VARCHAR(100) NOT NULL,
  qty INT UNSIGNED NOT NULL,
  total INT UNSIGNED NOT NULL,
  status ENUM('baru','diproses','selesai','dibatalkan') NOT NULL DEFAULT 'baru',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_id) REFERENCES menu(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  people TINYINT UNSIGNED NOT NULL,
  status ENUM('menunggu','dikonfirmasi','selesai','dibatalkan') NOT NULL DEFAULT 'menunggu',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS login_history (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  email VARCHAR(150) NOT NULL,
  status ENUM('berhasil','gagal','keluar') NOT NULL,
  ip_address VARCHAR(45) NOT NULL DEFAULT '',
  user_agent VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_created (created_at),
  INDEX idx_login_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Menu awal (hanya diisi jika tabel menu masih kosong)
INSERT INTO menu (name, price, category, description)
SELECT * FROM (
  SELECT 'Bakso Loka' AS name, 25000 AS price, 'Makanan' AS category, 'Bakso sapi kenyal dengan mie, bihun, dan kuah kaldu hangat.' AS description UNION ALL
  SELECT 'Mie Ayam Bakso', 27000, 'Makanan', 'Mie ayam dengan topping bakso dan pangsit goreng.' UNION ALL
  SELECT 'Nasi Goreng Spesial', 28000, 'Makanan', 'Nasi goreng dengan telur, ayam suwir, dan acar.' UNION ALL
  SELECT 'Mie Goreng Loka', 28000, 'Makanan', 'Mie goreng bumbu rumahan dengan telur dan sayuran.' UNION ALL
  SELECT 'Chicken Katsu Rice', 32000, 'Makanan', 'Ayam katsu renyah dengan nasi hangat dan saus spesial.' UNION ALL
  SELECT 'Kopi Susu Loka', 22000, 'Minuman', 'Kopi susu andalan Loka, pas menemani sesi main panjang.' UNION ALL
  SELECT 'Matcha Latte', 25000, 'Minuman', 'Matcha creamy dengan susu, disajikan dingin atau hangat.' UNION ALL
  SELECT 'Cappuccino', 24000, 'Minuman', 'Espresso dengan susu berbusa yang lembut.' UNION ALL
  SELECT 'Es Teh Manis', 8000, 'Minuman', 'Teh dingin manis yang menyegarkan.' UNION ALL
  SELECT 'Es Teh Lemon', 15000, 'Minuman', 'Teh dingin dengan perasan lemon segar.' UNION ALL
  SELECT 'Es Jeruk', 12000, 'Minuman', 'Jeruk peras dengan es batu.' UNION ALL
  SELECT 'Kentang Goreng', 20000, 'Cemilan', 'Kentang goreng renyah, enak dimakan sambil main.' UNION ALL
  SELECT 'Roti Bakar Coklat', 18000, 'Cemilan', 'Roti bakar tebal dengan selai coklat.' UNION ALL
  SELECT 'Pisang Goreng', 15000, 'Cemilan', 'Pisang goreng yang renyah di luar, lembut di dalam.' UNION ALL
  SELECT 'Tahu Crispy', 16000, 'Cemilan', 'Tahu goreng tepung renyah dengan sambal.'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM menu);

-- Katalog boardgame (dipakai bagian Katalog di beranda)
CREATE TABLE IF NOT EXISTS games (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  genre VARCHAR(30) NOT NULL,
  min_players TINYINT UNSIGNED NOT NULL DEFAULT 2,
  max_players TINYINT UNSIGNED NOT NULL DEFAULT 4,
  duration SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  difficulty ENUM('mudah','sedang','sulit') NOT NULL DEFAULT 'mudah',
  description VARCHAR(300) NOT NULL DEFAULT '',
  image_url VARCHAR(255) NOT NULL DEFAULT '',
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Game awal (hanya diisi jika tabel games masih kosong)
INSERT INTO games (title, genre, min_players, max_players, duration, difficulty, description)
SELECT * FROM (
  SELECT 'Catan' AS title, 'Strategi' AS genre, 3 AS min_players, 4 AS max_players, 90 AS duration, 'sedang' AS difficulty, 'Bangun desa dan jalan, tukar sumber daya, lalu rebut poin kemenangan lewat negosiasi yang cerdik.' AS description UNION ALL
  SELECT 'Ticket to Ride', 'Keluarga', 2, 5, 60, 'mudah', 'Kumpulkan kartu kereta dan sambungkan kota-kota lewat jalur rel terpanjang.' UNION ALL
  SELECT 'Carcassonne', 'Keluarga', 2, 5, 45, 'mudah', 'Susun ubin demi ubin menjadi kota, jalan, dan ladang, lalu taruh pionmu di tempat paling menguntungkan.' UNION ALL
  SELECT 'Pandemic', 'Kooperatif', 2, 4, 45, 'sedang', 'Satu tim melawan penyebaran penyakit di seluruh dunia. Menang atau kalah bersama-sama.' UNION ALL
  SELECT 'Forbidden Island', 'Kooperatif', 2, 4, 30, 'mudah', 'Kumpulkan harta dan kabur dari pulau yang perlahan tenggelam sebelum terlambat.' UNION ALL
  SELECT 'Codenames', 'Party', 4, 8, 20, 'mudah', 'Dua tim saling menebak kata rahasia lewat satu petunjuk dari kapten masing-masing.' UNION ALL
  SELECT 'Dixit', 'Party', 3, 6, 30, 'mudah', 'Tebak kartu bergambar surealis dari petunjuk yang tidak terlalu jelas, tapi juga tidak terlalu samar.' UNION ALL
  SELECT 'Exploding Kittens', 'Party', 2, 5, 15, 'mudah', 'Kartu cepat penuh kejutan. Hindari kucing meledak dan jebak lawanmu.' UNION ALL
  SELECT 'Splendor', 'Strategi', 2, 4, 30, 'mudah', 'Kumpulkan permata, beli kartu pengembangan, dan jadilah pedagang paling disegani.' UNION ALL
  SELECT 'Azul', 'Abstrak', 2, 4, 40, 'mudah', 'Pilih ubin warna-warni dan susun mozaik di papanmu dengan perhitungan yang rapi.' UNION ALL
  SELECT '7 Wonders', 'Strategi', 3, 7, 30, 'sedang', 'Kembangkan peradabanmu selama tiga zaman lewat kartu, dan bangun keajaiban dunia.' UNION ALL
  SELECT 'Terraforming Mars', 'Strategi', 1, 5, 120, 'sulit', 'Ubah Mars menjadi planet layak huni dengan membangun korporasi dan mengelola sumber daya.'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM games);


-- Foto asli boardgame dari folder img/.
UPDATE games SET image_url = 'img/catan game.jpg' WHERE title = 'Catan' AND (image_url = '' OR image_url IS NULL);
UPDATE games SET image_url = 'img/Ticket to Ride game.jpeg' WHERE title = 'Ticket to Ride' AND (image_url = '' OR image_url IS NULL);
UPDATE games SET image_url = 'img/Carcassonne game.jpeg' WHERE title = 'Carcassonne' AND (image_url = '' OR image_url IS NULL);
UPDATE games SET image_url = 'img/Pandemic game.jpg' WHERE title = 'Pandemic' AND (image_url = '' OR image_url IS NULL);
UPDATE games SET image_url = 'img/Forbidden Island game.jpg' WHERE title = 'Forbidden Island' AND (image_url = '' OR image_url IS NULL);
UPDATE games SET image_url = 'img/codenames game.jpeg' WHERE title = 'Codenames' AND (image_url = '' OR image_url IS NULL);
UPDATE games SET image_url = 'img/Dixit game.jpeg' WHERE title = 'Dixit' AND (image_url = '' OR image_url IS NULL);
UPDATE games SET image_url = 'img/exploding-kittens.jpg' WHERE title = 'Exploding Kittens' AND (image_url = '' OR image_url IS NULL);
UPDATE games SET image_url = 'img/splendor game.jpeg' WHERE title = 'Splendor' AND (image_url = '' OR image_url IS NULL);
UPDATE games SET image_url = 'img/azul game.jpeg' WHERE title = 'Azul' AND (image_url = '' OR image_url IS NULL);
UPDATE games SET image_url = 'img/7 wonders game.jpeg' WHERE title = '7 Wonders' AND (image_url = '' OR image_url IS NULL);
UPDATE games SET image_url = 'img/Terraforming Mars game.jpg' WHERE title = 'Terraforming Mars' AND (image_url = '' OR image_url IS NULL);

-- Foto menu (dari folder img/). Hanya mengisi yang masih kosong, aman dijalankan berulang.
UPDATE menu SET image_url = 'img/Bakso Loka.jpeg' WHERE name = 'Bakso Loka' AND image_url = '';
UPDATE menu SET image_url = 'img/Mie ayam loka.jpg' WHERE name = 'Mie Ayam Bakso' AND image_url = '';
UPDATE menu SET image_url = 'img/Nasi Goreng Loka spesial.jpg' WHERE name = 'Nasi Goreng Spesial' AND image_url = '';
UPDATE menu SET image_url = 'img/Mie Goreng Loka.jpg' WHERE name = 'Mie Goreng Loka' AND image_url = '';
UPDATE menu SET image_url = 'img/chicken katsu loka.jpg' WHERE name = 'Chicken Katsu Rice' AND image_url = '';
UPDATE menu SET image_url = 'img/Kopi susu loka.jpg' WHERE name = 'Kopi Susu Loka' AND image_url = '';
UPDATE menu SET image_url = 'img/matcha latte.jpg' WHERE name = 'Matcha Latte' AND image_url = '';
UPDATE menu SET image_url = 'img/capuccino loka.jpg' WHERE name = 'Cappuccino' AND image_url = '';
UPDATE menu SET image_url = 'img/es teh manis.jpg' WHERE name = 'Es Teh Manis' AND image_url = '';
UPDATE menu SET image_url = 'img/es teh lemon.jpg' WHERE name = 'Es Teh Lemon' AND image_url = '';
UPDATE menu SET image_url = 'img/es jeruk.jpg' WHERE name = 'Es Jeruk' AND image_url = '';
UPDATE menu SET image_url = 'img/Kentang Goreng.jpg' WHERE name = 'Kentang Goreng' AND image_url = '';
UPDATE menu SET image_url = 'img/Roti bakar coklat.jpeg' WHERE name = 'Roti Bakar Coklat' AND image_url = '';
UPDATE menu SET image_url = 'img/Pisang Goreng Sambal.jpg' WHERE name = 'Pisang Goreng' AND image_url = '';
UPDATE menu SET image_url = 'img/Tahu Crispy.jpeg' WHERE name = 'Tahu Crispy' AND image_url = '';

-- Modul konten panel admin
CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS articles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  category_id INT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  authors VARCHAR(150) NOT NULL,
  images TEXT NOT NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title_pages VARCHAR(150) NOT NULL,
  description VARCHAR(255) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  authors VARCHAR(150) NOT NULL,
  images TEXT NOT NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hero_sections (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  badge VARCHAR(100) NOT NULL,
  title VARCHAR(150) NOT NULL,
  highlight VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  catalog_label VARCHAR(60) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS web_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  site_name VARCHAR(100) NOT NULL,
  brand_name VARCHAR(60) NOT NULL,
  tagline VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS networkings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url VARCHAR(255) NOT NULL,
  description VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO hero_sections (id, badge, title, highlight, description, image_url, catalog_label)
VALUES (1, 'Boardgame Cafe #1 di Kota', 'Makan, Minum &', 'Main Bersama', 'Loka Boardgame Cafe: pesan menu, booking meja, dan sewa boardgame dari satu akun.', '', 'Lihat katalog');

INSERT IGNORE INTO web_settings (id, site_name, brand_name, tagline, description)
VALUES (1, 'Loka Boardgame Cafe', 'Loka', 'Boardgame Cafe', '');
