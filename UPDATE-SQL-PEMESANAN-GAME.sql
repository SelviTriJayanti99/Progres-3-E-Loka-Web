-- LOKA CMS V4 - upgrade database pemesanan boardgame dan menu
-- Aman untuk database loka_cafe yang sudah berisi pesanan.
-- Bisa dijalankan berulang: kolom dan indeks hanya dibuat jika belum tersedia.
-- Backup database melalui phpMyAdmin > Export sebelum eksekusi.
-- Pilih database loka_cafe di phpMyAdmin sebelum menjalankan berkas ini.
-- Tidak ada DROP / TRUNCATE / DELETE.

SET @has_game_column = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'selected_game_id'
);
SET @alter_orders = IF(
  @has_game_column = 0,
  'ALTER TABLE `orders` ADD COLUMN `selected_game_id` INT UNSIGNED NULL AFTER `menu_id`',
  'SELECT ''selected_game_id sudah ada'' AS info'
);
PREPARE stmt FROM @alter_orders;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_game_index = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND INDEX_NAME = 'idx_selected_game_id'
);
SET @alter_index = IF(
  @has_game_index = 0,
  'ALTER TABLE `orders` ADD INDEX `idx_selected_game_id` (`selected_game_id`)',
  'SELECT ''idx_selected_game_id sudah ada'' AS info'
);
PREPARE stmt FROM @alter_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verifikasi kolom dan data lama
SHOW COLUMNS FROM `orders`;
SELECT COUNT(*) AS total_pesanan_lama_dan_baru FROM `orders`;
