-- LOKA CMS V7 - Simpan NAMA game sebagai teks pada tabel orders.
-- Pilih database loka_cafe sebelum menjalankan file ini.
-- BACKUP database melalui phpMyAdmin > Export sebelum impor.
-- Tidak menghapus tabel / pesanan yang sudah ada.

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'selected_game_name');
SET @statement := IF(@exists = 0,
  'ALTER TABLE `orders` ADD COLUMN `selected_game_name` VARCHAR(100) NULL AFTER `selected_game_id`',
  'SELECT ''Kolom selected_game_name sudah ada'' AS info');
PREPARE loka_stmt FROM @statement;
EXECUTE loka_stmt;
DEALLOCATE PREPARE loka_stmt;

-- Isi nama untuk pesanan lama yang punya ID game; jangan timpa nama yang sudah disimpan.
UPDATE orders AS o JOIN games AS g ON g.id = o.selected_game_id
SET o.selected_game_name = g.title
WHERE o.selected_game_id IS NOT NULL
  AND (o.selected_game_name IS NULL OR o.selected_game_name = '');

-- Nama game tersimpan SECARA FISIK di orders, bukan hanya hasil JOIN.
SELECT id, item_name, selected_game_id, selected_game_name, total, status
FROM orders ORDER BY id DESC LIMIT 30;
