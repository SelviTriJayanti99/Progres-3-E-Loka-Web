# Loka Boardgame Cafe CMS V9

**Tema:** Warm Café (krem–cokelat). Referensi visual diadaptasi menjadi desain milik Loka, menggunakan aset foto lokal yang sudah ada.

**Checkout gabungan:** booking meja + game + item menu melalui `api/user.php?action=checkout` dalam transaksi MySQL atomik. Nama game disimpan sebagai `selected_game_name`. Pesanan menu diikat dengan booking menggunakan `booking_id` baru. Tidak ada data lama dihapus.

**Modul CMS tetap:** Article, Category, Pages, Hero Section, Web Settings, Networkings, katalog, akun, riwayat, admin, footer Instagram.

## Instalasi upgrade database lama

Backup folder dan database. Gunakan **hanya** `UPDATE-SQL-V9-CHECKOUT.sql` untuk meng-upgrade database yang sudah berisi data. Ini hanya membuat kolom `orders.booking_id` dan indeksnya jika belum ada. Jangan impor `database.sql` pada database lama. Gunakan XAMPP, bukan VS Code Live Server.

Lihat `PETUNJUK-V9-TEMA-DAN-CHECKOUT.txt` untuk rincian.

## Batasan

Harga sewa game dan biaya meja tidak ditambahkan karena belum ada kebijakan harga; tagihan saat ini hanya total menu. Status booking menunggu konfirmasi admin. Pengujian transaksi end-to-end tetap diperlukan pada database MySQL lokal.
