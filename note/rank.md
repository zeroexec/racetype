Berikut adalah ringkasan lengkap sistem **Point-Based Ranking** dan sistem pendukung yang saling berhubungan untuk *game* balapan mengetik Anda:

---

### 1. Ringkasan Struktur Rank (Daftar Poin)

Sistem menggunakan akumulasi poin total pemain untuk menentukan posisi Rank. Terdapat **7 Rank Utama** yang terbagi menjadi **Sub-Tier/Divisi** (kecuali Mythic) untuk menciptakan target jangka pendek yang jelas bagi pemain.

**Distribusi Poin & Rank:**

* **Warrior** (Rank Pemula)
* Sangat mudah dicapai untuk pemula.
* **Warrior III (0 – 149 Poin)** $\rightarrow$ **Warrior II (150 – 299 Poin)** $\rightarrow$ **Warrior I (300 – 499 Poin)**.


* **Elite**
* Mulai membutuhkan konsistensi.
* **Elite III (500 – 799 Poin)** $\rightarrow$ **Elite II (800 – 1.099 Poin)** $\rightarrow$ **Elite I (1.100 – 1.499 Poin)**.


* **Master**
* Rank menengah, persaingan mulai terasa.
* **Master IV (1.500)** $\rightarrow$ **Master III (2.000)** $\rightarrow$ **Master II (2.500)** $\rightarrow$ **Master I (3.000 – 3.499 Poin)**.


* **Grandmaster**
* Butuh kecepatan mengetik di atas rata-rata.
* **Grandmaster IV (3.500)** $\rightarrow$ **Grandmaster III (4.300)** $\rightarrow$ **Grandmaster II (5.100)** $\rightarrow$ **Grandmaster I (6.000 – 6.999 Poin)**.


* **Epic** (Awal Rank Tinggi)
* Sangat kompetitif. Poin sulit didapat, penalti mulai besar.
* **Epic V (7.000)** $\rightarrow$ **Epic IV (8.000)** $\rightarrow$ **Epic III (9.000)** $\rightarrow$ **Epic II (10.000)** $\rightarrow$ **Epic I (11.000 – 11.999 Poin)**.


* **Legend**
* Kumpulan pengetik cepat. Butuh *grinding* dan keahlian tinggi.
* **Legend V (12.000)** $\rightarrow$ **Legend IV (13.500)** $\rightarrow$ **Legend III (15.000)** $\rightarrow$ **Legend II (16.500)** $\rightarrow$ **Legend I (18.000 – 19.999 Poin)**.


* **Mythic** (Rank Tertinggi)
* Kasta tertinggi. Hanya untuk pemain terbaik.
* **Tercapai pada 20.000+ Poin.** Tidak ada Sub-Tier (ranking berdasarkan total poin Mythic).



---

### 2. Sistem Perolehan Poin per Balapan (Race Scoring)

Sistem ini berhubungan langsung dengan Rank karena menjadi satu-satunya cara untuk menaikkan poin. Poin dihitung dinamis di akhir balapan menggunakan rumus standar:

$$\text{Total Poin Match} = (\text{Karakter Benar } / \text{ 5}) + \text{Bonus/Penalty Juara}$$


*(Catatan: Karakter Benar / 5 diasumsikan sebagai "Jumlah Kata" standar industri ketik)*

**A. Skema Perolehan (Warrior ke Grandmaster)**
Di Rank rendah, bonus juara besar dan Juara 4 **tidak** dikurangi poin total (hanya mendapat 0 poin tambahan jika poin kata < 30).

* **Juara 1:** Kata + **Bonus 50 Poin**
* **Juara 2:** Kata + **Bonus 25 Poin**
* **Juara 3:** Kata + **Bonus 10 Poin**
* **Juara 4:** Kata + **Bonus 0 Poin** *(Poin tidak bisa berkurang)*

**B. Skema Perolehan Tinggi (Epic, Legend, Mythic)**
Di Rank tinggi, bonus juara dikurangi dan **Juara 4 dikenakan penalti berat yang dapat mengurangi total poin pemain.**

* **Juara 1:** Kata + **Bonus 30 Poin**
* **Juara 2:** Kata + **Bonus 15 Poin**
* **Juara 3:** Kata + **Bonus 5 Poin**
* **Juara 4:** Kata - **Penalty 30 Poin** *(Poin total bisa berkurang/turun Divisi)*

---

### 3. Sistem Keadilan & Kompetisi (Penalty Systems)

Dua sistem penalty ini berhubungan erat dengan Rank Tinggi untuk menjaga gengsi Rank Epic ke atas.

**A. Sanksi Juara 4 (Anti-AFK)**

* Berhubungan langsung dengan Rank **Epic, Legend, dan Mythic**.
* Jika pemain di Rank ini selesai di Juara 4 (karena lambat atau menyerah/AFK), total poin mereka dikurangi **30 Poin**.
* Sistem ini memastikan pemain Tryhard untuk setidaknya tidak menjadi yang terakhir.

**B. Sanksi Inaktivitas (Point Decay)**

* Berhubungan dengan **Rank Epic, Legend, dan Mythic** serta data **Waktu Terakhir Balapan (database: last_raced_at)**.
* Pemain di Rank tinggi wajib bermain setidaknya satu kali dalam **7 hari**.
* Jika inaktif > 7 hari, poin akan dipotong otomatis setiap 24 jam sekali:
* **Epic:** Potong **-50 Poin** / hari
* **Legend:** Potong **-100 Poin** / hari
* **Mythic:** Potong **-200 Poin** / hari


* Sistem ini mencegah pemain "membekukan" rank mereka di posisi tinggi tanpa bermain lagi.

---

### 4. Sistem Performa Balapan (Race Mechanics)

Sistem ini adalah fondasi performa pemain yang secara tidak langsung menentukan perolehan poin dan rank mereka.

* **Papan Teks Ketik:**
* Teks mengunci jika salah (input tertahan sampai huruf diperbaiki).
* Input tidak bisa dihapus (Backspace mati untuk huruf yang sudah benar).


* **Respon Visual Kesalahan:**
* Pesan visual "Huruf Salah" yang tidak mencolok di bawah papan ketik untuk *feedback* instan tanpa mengganggu fokus.


* **Visual Balapan (Mobil):**
* Mobil bergerak lancar dari 0% ke 100% berdasarkan progres karakter yang diketik, memberikan visualisasi performa WPM pemain terhadap lawan.


* **Ranking Finish:**
* Sistem mencatat urutan finish secara runtut (Juara 1, 2, 3, 4) begitu mobil menyentuh garis 100%. Peringkat ini yang digunakan untuk menentukan Bonus/Penalty Poin di Sistem Match Scoring.