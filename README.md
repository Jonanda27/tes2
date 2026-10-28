# ♠ Texas Hold'em Online Multiplayer Game (VIP Lounge)

Game kartu poker Texas Hold'em online real-time yang dapat dimainkan bersama teman via browser di laptop maupun HP dengan Room Code / Invite Link.

## 🌟 Fitur Utama
- **Modal Chip Awal**: Setiap pemain yang duduk otomatis mendapatkan **Rp 100.000**.
- **Fitur Rebuy**: Jika chip habis (Rp 0), pemain dapat langsung mengisi ulang Rp 100.000 secara gratis.
- **Aturan Standar Texas Hold'em**:
  - 2 Kartu tangan (*Hole Cards*) + 5 Kartu komunitas di meja (*Flop, Turn, River*).
  - *Small Blind* (Rp 1.000) & *Big Blind* (Rp 2.000).
  - Evaluasi kombinasi kartu standar 7-card (Royal Flush hingga High Card) beserta penentu *tiebreaker*.
  - Kalkulasi *Side Pot* otomatis jika ada pemain yang All-In dengan chip berbeda.
- **Server-Authoritative Anti-Cheat**: Kartu lawan tidak dikirim ke browser sebelum tahap Showdown.
- **Multiplayer & Room System**:
  - Tombol **Salin Link Undangan** untuk share ke teman (contoh: `?room=meja-1` atau kode custom seperti `?room=TEMAN`).
  - Maksimal 8 kursi per meja dengan spectator mode (penonton) jika belum duduk.
- **Bot AI**:
  - Tombol **+ Bot AI** untuk menambahkan pemain komputer saat ingin bermain solo atau mengisi kursi kosong bersama teman.
- **Audio & Visual Premium**:
  - Desain meja oval green felt dengan lis kulit mahoni dan aksen emas.
  - Efek suara sintetis (Web Audio API) untuk pembagian kartu, denting chip, ketuk check, dan musik kemenangan.
  - Efek perayaan konfeti saat Showdown.
  - Live Dealer Chat & Log di pojok kanan bawah.

---

## 🚀 Cara Menjalankan

### Menjalankan Server & Client Bersamaan
Di folder root:
```bash
# Install dependencies
pnpm install:all

# Jalankan dalam mode development (Server port 3050 & Client port 5173)
pnpm dev
```

### Menjalankan Build Produksi (Single Port 3050)
Server Node.js sudah otomatis menyajikan bundle client dari `client/dist`:
```bash
# Build client & server
cd client && pnpm build
cd ../server && pnpm build

# Jalankan server
node server/dist/index.js
```
Buka browser di: **`http://localhost:3050`**

---

## 🌐 Bermain Bersama Teman
1. Buka game di browser Anda (`http://localhost:3050`).
2. Klik tombol **Meja: MEJA-1** di pojok kanan atas, lalu klik **Salin Link Undangan Teman**.
3. Jika bermain di jaringan lokal (WiFi yang sama), ganti `localhost` dengan IP lokal laptop Anda (misal `http://192.168.1.50:3050?room=meja-1`).
4. Teman Anda tinggal membuka link tersebut, klik kursi kosong bertanda **+ Duduk**, dan permainan langsung dimulai!
