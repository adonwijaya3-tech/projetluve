# LuVenXe Store — Paket Netlify + Supabase (tahap backend)

Tema frontend tetap hitam + biru neon. Paket ini menyiapkan fondasi serverless dan database, bukan klaim bahwa seluruh fitur sudah siap transaksi produksi.

## Isi paket
- `site/index.html`: halaman toko yang telah dipoles, masih menggunakan autentikasi dan data lokal untuk sebagian besar tampilan.
- `site/admindhasbor.html`: halaman admin dikunci sementara supaya login demo tidak dapat dipakai di situs publik.
- `reference/admindhasbor-demo-local.html`: salinan dashboard lama untuk referensi lokal. Folder `reference` tidak termasuk direktori publik Netlify. Login dan datanya berbasis browser, jadi jangan dipindahkan ke `site`.
- `netlify.toml`: konfigurasi deploy, header keamanan dasar, dan alias API.
- `netlify/functions/health.mjs`: endpoint pemeriksaan konfigurasi backend.
- `netlify/functions/create-order.mjs`: endpoint pembuatan pesanan yang memverifikasi token Supabase, membaca harga/stok dari database, lalu menghitung total di server.
- `netlify/functions/discord-testimonial.mjs`: relay webhook Discord yang hanya menerima permintaan dari akun admin terverifikasi.
- `supabase/schema.sql`: skema awal profil, produk, metode pembayaran, pesanan, pengaturan, dan chat dengan RLS.
- `.env.example`: daftar environment variables yang perlu disetel, bukan kredensial sungguhan.

## 1. Buat proyek Supabase
1. Buat proyek baru di Supabase.
2. Buka **SQL Editor**, lalu jalankan seluruh isi `supabase/schema.sql`.
3. Buka **Project Settings → API** dan salin Project URL, publishable/anon key, serta service-role key.
4. Buat akun owner melalui Supabase Auth. Verifikasi email sesuai konfigurasi proyek.
5. Di SQL Editor, cari UUID akun owner tersebut lalu jalankan:

```sql
update public.profiles set role = 'admin' where id = 'UUID_AKUN_OWNER';
```

Jangan memberi role admin dari form daftar atau berdasarkan nama/email pengguna.

## 2. Atur Netlify
1. Unggah folder ini ke repositori Git dan hubungkan repositori tersebut ke Netlify. `netlify.toml` mengatur `site/` sebagai direktori publik, sedangkan Functions dan skema database tetap di luar direktori publik. Hindari mengubah `publish = "site"` menjadi `.` agar file konfigurasi dan referensi tidak terekspos.
2. Pada **Site configuration → Environment variables**, isi:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DISCORD_TESTIMONIAL_WEBHOOK` (opsional)
3. Jangan menaruh service-role key atau URL webhook rahasia di HTML, JavaScript browser, repositori publik, atau localStorage.
4. Deploy ulang setelah mengatur environment variables.
5. Buka `/api/health`. Hasil `backendConfigured: true` hanya berarti variabel tersedia, bukan berarti semua alur aplikasi sudah lulus pengujian.

## 3. Batasan yang masih harus diselesaikan sebelum rilis

**Jangan terima transaksi nyata dulu.** Frontend toko pada paket ini belum sepenuhnya dimigrasikan dari `localStorage` ke Supabase. Endpoint backend sudah disiapkan, tetapi form checkout, daftar/login pelanggan, dashboard admin, daftar pesanan, stok, metode pembayaran, chat, dan leaderboard masih perlu dihubungkan ke API/database. Dashboard admin sengaja dikunci hingga integrasi autentikasi selesai.

- **Autentikasi pelanggan:** form HTML lama tidak memiliki password dan masih memakai simulasi login lokal. Ganti dengan Supabase Auth (email/password atau OTP), sesi yang benar, serta tombol logout yang menghapus sesi Auth.
- **Autentikasi admin:** perlu pemeriksaan JWT dan role `admin` untuk setiap operasi admin, bukan hanya menyembunyikan halaman.
- **Pesanan:** endpoint `create-order` sudah memvalidasi produk, stok, metode pembayaran, dan menghitung total dari database. Namun, integrasi UI belum dilakukan; pencegahan race condition stok dan idempotency perlu ditambahkan sebelum volume tinggi.
- **Pembayaran:** belum ada payment gateway atau verifikasi pembayaran otomatis. QRIS manual hanya boleh mengubah status setelah admin memeriksa bukti/penerimaan dana. Jangan menganggap halaman sukses sebagai bukti pembayaran.
- **Webhook Discord:** endpoint relay tersedia. Panggil hanya setelah admin mengubah status pesanan di backend dan setelah order diverifikasi. Saat ini endpoint menerima ID pesanan untuk notifikasi umum, bukan mengambil detail transaksi atau mengubah status order.
- **Admin CRUD:** operasi produk, stok, banner, pengaturan, status pesanan, dan chat belum dipindahkan ke fungsi server. Jangan memakai dashboard demo untuk pengelolaan publik.
- **Keamanan operasional:** pasang rate limiting/anti-spam, batasi ukuran request, pantau log fungsi, buat backup database, aktifkan verifikasi email, gunakan HTTPS, dan uji RLS menggunakan akun member serta admin.
- **Data pribadi:** simpan hanya data yang diperlukan, buat kebijakan privasi, dan jangan kirim nomor WhatsApp/identitas pelanggan ke Discord jika tidak dibutuhkan.
- **Kebijakan Netlify:** fungsi membutuhkan deploy environment yang mendukung Netlify Functions. Jika menguji file HTML langsung lewat `file://`, endpoint `/api/*` tidak akan berjalan.

## 4. Pemeriksaan awal

- `GET /api/health` — pemeriksaan status konfigurasi.
- `POST /api/orders` — memerlukan header `Authorization: Bearer <Supabase access token>` dan JSON `productId`, `paymentMethodId`, `robloxUsername`, `whatsapp`, opsional `note`.
- `POST /api/discord-testimonial` — memerlukan token Supabase admin dan JSON `{ "orderId": "..." }`.

Jangan menguji endpoint pembuatan pesanan sebelum produk dan metode pembayaran aktif tersedia di database. Semua error server dicatat secara ringkas; jangan menampilkan rahasia environment ke browser.

## Status
Fondasi deploy dan backend awal: disiapkan. Integrasi penuh frontend, autentikasi, dashboard admin, dan pembayaran: **belum selesai**. Ini sengaja dinyatakan jelas agar toko tidak salah dianggap siap transaksi.
