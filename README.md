# Loka Boardgame Cafe — CMS V7

**Perbaikan utama:** pemesanan menyimpan nama game sebagai teks langsung di kolom `orders.selected_game_name`, disertai verifikasi setelah INSERT.

Baca **PANDUAN-V7-NAMA-GAME.txt** dan gunakan **UPDATE-SQL-V7-NAMA-GAME-TERSIMPAN.sql** untuk instalasi lama.

---
# Loka Boardgame Cafe — CMS V6

**Pembaruan V6:** nama boardgame sekarang tersimpan langsung pada kolom `orders.selected_game_name`, bukan hanya ID. Migrasi mengisi nama untuk pesanan lama dan admin mempunyai kolom boardgame tersendiri.

Baca **PETUNJUK-V6-NAMA-GAME.txt** untuk prosedur backup, upgrade dan pengujian.

---

# Loka Boardgame Cafe: PHP + MySQL (phpMyAdmin)

Data disimpan di database MySQL (`loka_cafe`), bisa dilihat dan diubah lewat phpMyAdmin.

## Struktur folder
```
loka-web/
  index.html  style.css  script.js
  database.sql   <- diimpor ke phpMyAdmin
  setup.php      <- buat akun admin (hapus setelah dipakai)
  migrate.php    <- update database lama (jalankan sekali, lalu hapus)
  img/           <- foto menu dan boardgame tersedia di sini
  api/
    config.php  bootstrap.php  auth.php  user.php  admin.php  catalog.php
```

## Langkah menjalankan (XAMPP)
1. Nyalakan **Apache** dan **MySQL** di XAMPP Control Panel.
2. Salin folder `loka-web` ke `C:\xampp\htdocs\`.
3. Buka http://localhost/phpmyadmin, tab **Import**, pilih `database.sql`, klik **Go**.
   Kalau database sebelumnya sudah diimpor, impor ulang saja: aman, data lama tidak terhapus, dan tabel `games` (katalog boardgame) ditambahkan.
   Database lama juga perlu membuka http://localhost/loka-web/migrate.php **sekali** (menambah kategori, deskripsi, dan foto pada menu, serta melengkapi menu awal seperti Bakso). Lalu **hapus migrate.php**.
4. Jika MySQL kamu punya kata sandi, ubah `api/config.php`.
5. Buka http://localhost/loka-web/setup.php sekali untuk membuat admin, lalu **hapus setup.php**.
6. Buka http://localhost/loka-web/

Akun admin awal: `admin@loka.id` / `admin123` (ganti kata sandinya di `setup.php` sebelum dijalankan).

Catatan: jangan buka dengan klik dua kali `index.html` atau Live Server, karena PHP tidak jalan di sana.

## Fitur
- Katalog publik di beranda: boardgame (cari, filter genre, filter jumlah pemain, urutkan) dan menu. Bisa dilihat tanpa login.
- Pelanggan: daftar, masuk, katalog menu bergaya toko (kategori, pencarian, keranjang) langsung tampil setelah login, pesan beberapa menu sekaligus, booking meja, batalkan, riwayat, edit profil.
- Admin: statistik, ubah status pesanan dan booking, kelola menu (kategori, deskripsi, foto), kelola boardgame (judul, genre, pemain, durasi, kesulitan, tersedia/dipakai), hapus pelanggan, riwayat login.


## Foto menu
Taruh foto di folder `img/` (misal `img/bakso.jpg`), lalu isi kolom **Foto** di Dashboard admin > Menu dengan `img/bakso.jpg`. Alamat `https://...` juga bisa. Tanpa foto, kartu memakai ilustrasi ikon sesuai kategori.

## Panel admin konten

Untuk instalasi baru, impor `database.sql` lalu jalankan `migrate.php` sekali untuk memastikan skema lengkap. Untuk situs yang sudah berjalan, salin file proyek yang diperbarui lalu buka `migrate.php` sekali di browser: ini menambah foto boardgame dan membuat seluruh tabel CMS. File ini membuat tabel konten dan mengisi pengaturan awal jika diperlukan. Simpan salinan konfigurasi koneksi lokal di `api/config.php` saat memperbarui situs.

Setelah masuk sebagai admin, geser deretan tab bila perlu untuk membuka modul berikut.

- **Article** mengelola artikel, kategori opsional, penulis, gambar, dan status terbit.
- **Category** mengelola kategori artikel. Saat kategori dihapus, artikel terkait tetap tersimpan tanpa kategori.
- **Pages** mengelola judul halaman, deskripsi, isi, penulis, gambar, dan status terbit. Waktu dibuat dan diperbarui dicatat otomatis.
- **Hero Section** mengatur label, judul, sorotan, deskripsi, gambar, dan teks tombol katalog pada bagian atas beranda.
- **Web Settings** mengatur judul situs di tab browser, nama merek, tagline, dan deskripsi situs.
- **Networkings** mengelola tautan jejaring atau mitra. Aktifkan **Tampilkan di beranda** agar pengunjung bisa melihat tautannya.

Artikel dan halaman baru menjadi draf sampai **Terbitkan** dicentang. Isi tampil sebagai teks biasa. Untuk gambar, masukkan satu alamat HTTP(S) atau path seperti `img/Bakso Loka.jpeg` per baris. Beranda menampilkan artikel dan halaman terbit di bawah katalog.


## Upgrade Progres III (10 November 2026)
- **Article:** formulir tambah/edit/hapus, draft/terbit, penulis, kategori, gambar, pencarian teks dan filter kategori pada beranda.
- **Category:** kelola kategori dan gunakan sebagai filter artikel yang sudah terbit.
- **Pages:** tambah/edit/hapus halaman dengan status publikasi dan kartu informasi di beranda.
- **Hero Section:** atur judul, label, sorotan, deskripsi, gambar, tombol katalog; gambar gagal dimuat disembunyikan.
- **Web Settings:** ubah nama situs/tab, merek, tagline, deskripsi SEO dari panel admin.
- **Networkings:** kelola tautan mitra dan status tampil; tautan publik dibuka di tab baru dengan rel aman.
- Penyempurnaan UI: kartu konten responsif, gambar sampul, tanggal, penghitung artikel, tampilan isi yang dapat dibuka, informasi status pengelola.

**Update instalasi lama:** backup database terlebih dahulu, timpa file proyek (pertahankan `api/config.php` asli), lalu impor `cms-upgrade.sql` melalui phpMyAdmin. SQL memakai `CREATE TABLE IF NOT EXISTS` dan `INSERT IGNORE`. Tidak perlu menjalankan `setup.php` ulang apabila akun admin sudah tersedia.
**Catatan pengujian:** pemeriksaan sintaks dapat dilakukan tanpa database; untuk mencoba CRUD dan publikasi secara nyata perlu Apache dan MySQL aktif.
