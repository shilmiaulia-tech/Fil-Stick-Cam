# WebRTC Face Filter Booth

WebRTC Face Filter Booth adalah aplikasi web berbasis WebRTC yang memungkinkan pengguna menggunakan kamera secara langsung, menerapkan filter visual, menambahkan sticker berbasis face tracking, mengambil gambar, serta menyimpan hasil tangkapan ke berbagai format gambar. Aplikasi berjalan secara lokal melalui browser menggunakan localhost.

## Fitur Utama

* Menampilkan video webcam secara real-time menggunakan WebRTC.
* Mendeteksi wajah pengguna menggunakan face-api.js.
* Menambahkan sticker yang mengikuti posisi wajah secara otomatis.
* Menerapkan filter visual pada video.
* Mengambil foto dari hasil video beserta filter dan sticker yang aktif.
* Menyimpan gambar dalam format JPG, PNG, dan WEBP.
* Menampilkan preview hasil tangkapan.
* Menyimpan hasil capture pada galeri sementara.
* Mengunduh kembali gambar dari galeri.
* Menghapus gambar dari galeri.

## Teknologi yang Digunakan

### Frontend

* HTML5
* CSS3
* JavaScript ES6

### Library dan Framework

* WebRTC (getUserMedia API)
* face-api.js
* Express.js

### Model AI

* Tiny Face Detector
* Face Landmark 68 Model

### Format Gambar

* JPEG (.jpg)
* PNG (.png)
* WEBP (.webp)

## Struktur Proyek

```text
project/
│
├── assets/
│   └── face-api.min.js
│
├── css/
│   └── style.css
│
├── js/
│   ├── app.js
│   ├── webcam.js
│   ├── faceTracking.js
│   ├── filters.js
│   ├── capture.js
│   └── gallery.js
│
├── models/
│   ├── tiny_face_detector_model-shard1
│   ├── tiny_face_detector_model-weights_manifest.json
│   ├── face_landmark_68_model-shard1
│   ├── face_landmark_68_model-weights_manifest.json
│   └── README.md
│
├── stickers/
│   ├── glasses.png
│   ├── hat.png
│   ├── topi.png
│   ├── moustache.png
│   └── matalove.png
│
├── index.html
├── server.js
└── README.md
```

## Cara Instalasi

### 1. Clone Repository

```bash
git clone <url-repository>
```

### 2. Masuk ke Folder Proyek

```bash
cd WebRTC-Face-Filter-Booth
```

### 3. Install Dependency

```bash
npm install
npm install express
```

## Menjalankan Aplikasi

Jalankan server menggunakan Node.js:

```bash
node server.js
```

Server akan berjalan pada:

```text
http://localhost:3000
```

atau dapat diakses melalui alamat IP lokal:

```text
http://alamat-ip-komputer:3000
```

## Cara Penggunaan

1. Jalankan aplikasi melalui browser.
2. Izinkan akses kamera ketika diminta.
3. Pilih filter yang diinginkan.
4. Pilih sticker yang ingin digunakan.
5. Arahkan wajah ke kamera.
6. Sistem akan mendeteksi wajah dan menempatkan sticker secara otomatis.
7. Tekan tombol Capture untuk mengambil gambar.
8. Hasil capture akan ditampilkan pada bagian preview.
9. Pilih format file yang diinginkan.
10. Tekan tombol Download untuk menyimpan gambar.
11. Hasil capture juga akan tersimpan pada galeri sementara.

## Alur Sistem

1. Browser meminta izin akses kamera.
2. WebRTC mengaktifkan webcam.
3. Video real-time ditampilkan pada halaman web.
4. Model face-api.js dimuat.
5. Sistem mendeteksi wajah pengguna.
6. Landmark wajah dihitung.
7. Sticker ditempatkan berdasarkan posisi landmark.
8. Filter visual diterapkan pada video.
9. Pengguna melakukan capture.
10. Sistem membuat canvas hasil akhir.
11. Gambar disimpan ke preview dan galeri.
12. Pengguna dapat mengunduh gambar sesuai format yang dipilih.

## Contoh Penggunaan

### Penggunaan Filter

Pengguna memilih filter grayscale sehingga tampilan video berubah menjadi hitam putih.

### Penggunaan Sticker

Pengguna memilih sticker kacamata. Sistem mendeteksi posisi mata dan menempatkan gambar kacamata secara otomatis mengikuti pergerakan wajah.

### Pengambilan Gambar

Pengguna menekan tombol Capture. Sistem menghasilkan gambar yang telah berisi filter dan sticker, kemudian pengguna dapat mengunduhnya dalam format JPG, PNG, atau WEBP.

## Catatan

* Aplikasi memerlukan kamera yang berfungsi dengan baik.
* Browser harus mendukung WebRTC.
* Koneksi internet hanya diperlukan saat proses instalasi dependency.
* Model face-api.js harus tersedia di folder `models`.
* Aplikasi dirancang untuk dijalankan pada localhost menggunakan Node.js.
* Data gambar tidak disimpan ke database dan hanya tersimpan selama sesi aplikasi berlangsung.

## Pengembang

Proyek ini dikembangkan sebagai proyek akhir mata kuliah Jaringan Multimedia.
Nama: Shilmi Aulia Yustina
NRP: 5124500011
Prodi: Teknologi Multimedia dan Broadcasting

Nama Proyek: 

WebRTC Face Filter Booth

Teknologi Utama:

* WebRTC
* JavaScript
* face-api.js
* HTML5
* CSS3
* Express.js
