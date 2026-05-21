```markdown
# 🚀 JANDA-BAPAS

Proyek ini adalah aplikasi web modern yang dibangun menggunakan ekosistem React terbaru dengan build tool Vite, dikombinasikan dengan antarmuka dari Shadcn UI dan backend-as-a-service dari Supabase.

## 🛠️ Teknologi yang Digunakan
- **Frontend**: React 18, Vite 8, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI (Radix UI)
- **Routing**: React Router DOM
- **State/Data Fetching**: React Query, React Hook Form + Zod
- **Backend & Database**: Supabase (PostgreSQL)
- **Testing**: Vitest (Unit), Playwright (E2E)
- **Pemrosesan Dokumen**: PDF.js, Mammoth (.docx), jsPDF

---

## 📋 Prasyarat

Sebelum memulai, pastikan sistem Anda telah menginstal perangkat lunak berikut:

### 1. Instalasi Node.js
Proyek ini membutuhkan **Node.js** (direkomendasikan versi 18.x LTS atau 20.x LTS).
- Kunjungi situs resmi Node.js: [https://nodejs.org/](https://nodejs.org/)
- Unduh dan jalankan installer untuk sistem operasi Anda.
- Verifikasi instalasi dengan menjalankan perintah berikut di terminal:
  ```bash
  node -v
  npm -v

```

### 2. Akun Supabase

Pastikan Anda sudah memiliki akun di [Supabase](https://supabase.com/) dan telah membuat proyek baru untuk menyimpan database Anda.

---

## 🚀 Panduan Instalasi Lokal

**1. Clone repositori**

```bash
git clone <url-repositori-anda>
cd JANDA-BAPAS

```

**2. Instal dependensi**
Anda dapat menggunakan `npm`, `yarn`, atau `bun` (disarankan menyesuaikan dengan lockfile yang ada di proyek).

```bash
npm install
# atau
bun install

```

**3. Konfigurasi Environment Variables**
Buat file `.env` di *root directory* proyek Anda dan salin kredensial dari dashboard proyek Supabase Anda (menu **Project Settings > API**):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<kunci-anon-supabase-anda>

```

---

## 🗄️ Migrasi Database (Supabase)

Proyek ini menggunakan Supabase CLI untuk mengelola struktur database secara lokal maupun mem-push ke production.

**1. Instal Supabase CLI**

```bash
npm install -g supabase

```

**2. Login ke Supabase via Terminal**

```bash
supabase login

```

*Token akses dapat dibuat melalui dashboard Supabase.*

**3. Tautkan Proyek Lokal ke Remote Supabase**

```bash
supabase link --project-ref <id-proyek-supabase-anda>

```

**4. Terapkan Migrasi Database ke Cloud**
Untuk menjalankan skema database/tabel yang ada di folder `supabase/migrations` ke database Supabase Anda:

```bash
supabase db push

```

---

## 💻 Menjalankan Aplikasi

Untuk menjalankan server pengembangan (*development server*):

```bash
npm run dev
# atau
bun run dev

```

Aplikasi akan berjalan di `http://localhost:5173`.

### Skrip Lainnya:

* `npm run build`: Mem-build aplikasi untuk *production*.
* `npm run lint`: Memeriksa kode menggunakan ESLint.
* `npm run test`: Menjalankan *unit testing* menggunakan Vitest.
* `npm run preview`: Mempratinjau hasil *build production* secara lokal.

---

## 🌍 Deployment

### Deployment Frontend (Rekomendasi: Vercel)

Karena proyek ini berbasis Vite, *deployment* ke Vercel sangat disarankan.

1. Buat akun / Login ke [Vercel](https://vercel.com/).
2. Klik **Add New... > Project**.
3. Import repositori GitHub/GitLab/Bitbucket yang berisi proyek ini.
4. Pada menu **Framework Preset**, pilih **Vite**.
5. Pada menu **Environment Variables**, masukkan konfigurasi `.env` Anda:
* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_ANON_KEY`


6. Klik **Deploy**. Vercel akan menjalankan `npm run build` dan mempublikasikan aplikasi secara otomatis.

### Deployment Database

Database dan backend (otentikasi, storage) sepenuhnya di-hosting (dan dikelola) oleh Supabase. Memastikan migrasi Anda telah di-push (`supabase db push`) berarti sisi backend sudah siap digunakan pada lingkungan *production*.

```

```
