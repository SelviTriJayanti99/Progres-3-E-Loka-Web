-- LOKA BOARDGAME CAFE / CMS V6
-- Jalankan di phpMyAdmin setelah memilih database loka_cafe.
-- Backup database (Export) terlebih dahulu.
-- Tidak menghapus pesanan atau mengganti data yang sudah tersimpan.
-- Aman dijalankan lebih dari sekali.

SET @kolom_id_ada := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'selected_game_id'
);
SET @q := IF(@kolom_id_ada = 0,
  'ALTER TABLE `orders` ADD COLUMN `selected_game_id` INT UNSIGNED NULL AFTER `menu_id`',
  'SELECT ''Kolom selected_game_id sudah tersedia'' AS info');
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @kolom_nama_ada := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'selected_game_name'
);
SET @q := IF(@kolom_nama_ada = 0,
  'ALTER TABLE `orders` ADD COLUMN `selected_game_name` VARCHAR(100) NULL AFTER `selected_game_id`',
  'SELECT ''Kolom selected_game_name sudah tersedia'' AS info');
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Pesanan terdahulu: isi nama dari tabel games menggunakan ID yang sudah tersimpan.
-- Jika dahulu tanpa pilihan game, kolom tetap NULL (ditampilkan sebagai Tanpa boardgame di UI).
UPDATE `orders` AS o
INNER JOIN `games` AS g ON g.id = o.selected_game_id
SET o.selected_game_name = g.title
WHERE o.selected_game_id IS NOT NULL
  AND (o.selected_game_name IS NULL OR o.selected_game_name = '');

-- Verifikasi: nama game terlihat langsung pada tabel orders di phpMyAdmin > Browse.
SELECT id, item_name, selected_game_id, selected_game_name, qty, total, status
FROM `orders` ORDER BY id DESC LIMIT 20;
