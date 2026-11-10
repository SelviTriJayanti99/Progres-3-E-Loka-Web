-- Loka CMS V9: JALANKAN PADA database loka_cafe (backup terlebih dahulu).
-- Periksa apakah kolom booking_id telah ada sebelum menjalankan ALTER di bawah.
-- Untuk migrasi otomatis dan aman diulang, gunakan http://localhost/NAMA-FOLDER/migrate.php
USE loka_cafe;
SET @exists_col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'booking_id');
SET @sql := IF(@exists_col = 0, 'ALTER TABLE orders ADD COLUMN booking_id INT UNSIGNED NULL AFTER selected_game_name', 'SELECT ''booking_id sudah ada'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @exists_idx := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_order_booking');
SET @sql := IF(@exists_idx = 0, 'ALTER TABLE orders ADD INDEX idx_order_booking (booking_id)', 'SELECT ''index sudah ada'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- Konfirmasi struktur:
SHOW COLUMNS FROM orders LIKE 'booking_id';
