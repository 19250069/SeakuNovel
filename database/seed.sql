USE seaku_novel;

INSERT INTO genres (name, slug) VALUES
  ('Fantasy', 'fantasy'),
  ('Adventure', 'adventure'),
  ('Thriller', 'thriller'),
  ('Romance', 'romance'),
  ('Sci-Fi', 'sci-fi'),
  ('Horror', 'horror'),
  ('Slice of Life', 'slice-of-life'),
  ('Drama', 'drama');

SET @admin_id = UUID();
SET @author1_id = UUID();
SET @author2_id = UUID();
SET @author3_id = UUID();
SET @author4_id = UUID();
SET @author5_id = UUID();
SET @reader1_id = UUID();
SET @reader2_id = UUID();
SET @reader3_id = UUID();

INSERT INTO users (id, username, email, password_hash, display_name, avatar_url, bio, role) VALUES
  (@admin_id, 'admin', 'admin@seakunovel.com', '$2a$10$hashed_admin_password_placeholder', 'Admin', NULL, 'Platform administrator', 'admin'),
  (@author1_id, 'aryapratama', 'arya@example.com', '$2a$10$hashed_password_placeholder', 'Arya Pratama', NULL, 'Fantasy author', 'author'),
  (@author2_id, 'saridewi', 'sari@example.com', '$2a$10$hashed_password_placeholder', 'Sari Dewi', NULL, 'Adventure writer', 'author'),
  (@author3_id, 'rezamahendra', 'reza@example.com', '$2a$10$hashed_password_placeholder', 'Reza Mahendra', NULL, 'Thriller storyteller', 'author'),
  (@author4_id, 'linakusuma', 'lina@example.com', '$2a$10$hashed_password_placeholder', 'Lina Kusuma', NULL, 'Sci-Fi enthusiast', 'author'),
  (@author5_id, 'bungaayu', 'bunga@example.com', '$2a$10$hashed_password_placeholder', 'Bunga Ayu', NULL, 'Romance writer', 'author'),
  (@reader1_id, 'mayasari', 'maya@example.com', '$2a$10$hashed_password_placeholder', 'Maya Sari', NULL, 'Avid reader', 'reader'),
  (@reader2_id, 'budisantoso', 'budi@example.com', '$2a$10$hashed_password_placeholder', 'Budi Santoso', NULL, 'Book reviewer', 'reader'),
  (@reader3_id, 'rinafitriani', 'rina@example.com', '$2a$10$hashed_password_placeholder', 'Rina Fitriani', NULL, 'Casual reader', 'reader');

SET @novel1_id = UUID();
SET @novel2_id = UUID();
SET @novel3_id = UUID();
SET @novel4_id = UUID();
SET @novel5_id = UUID();
SET @novel6_id = UUID();
SET @novel7_id = UUID();
SET @novel8_id = UUID();

INSERT INTO novels (id, title, slug, synopsis, cover_url, author_id, status, total_chapters, total_words, average_rating, total_views) VALUES
  (@novel1_id, 'Cahaya di Ujung Kegelapan', 'cahaya-di-ujung-kegelapan', 'Seorang pemuda biasa menemukan buku sihir kuno yang membawanya ke dimensi lain penuh misteri.', 'https://images.unsplash.com/photo-1762554915502-7ce95effe4ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW50YXN5JTIwbWFnaWMlMjBib29rJTIwZGFya3xlbnwxfHx8fDE3NzY1MjQ3MTJ8MA&ixlib=rb-4.1.0&q=80&w=1080', @author1_id, 'published', 142, 345000, 4.80, 23500),
  (@novel2_id, 'Petualangan Tanpa Batas', 'petualangan-tanpa-batas', 'Perjalanan epik melintasi benua yang belum terjamah demi menemukan artefak legendaris.', 'https://images.unsplash.com/photo-1761470215949-927859e8f334?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZHZlbnR1cmUlMjBtb3VudGFpbiUyMGxhbmRzY2FwZSUyMGVwaWN8ZW58MXx8fHwxNzc2NTI0NzEzfDA&ixlib=rb-4.1.0&q=80&w=1080', @author2_id, 'published', 89, 210000, 4.60, 18200),
  (@novel3_id, 'Bisikan Malam Terakhir', 'bisikan-malam-terakhir', 'Detektif muda menyelidiki kasus pembunuhan berantai yang terhubung dengan masa lalunya.', 'https://images.unsplash.com/photo-1770150511162-f526ca633688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwdGhyaWxsZXIlMjBteXN0ZXJ5JTIwbmlnaHR8ZW58MXx8fHwxNzc2NTI0NzEzfDA&ixlib=rb-4.1.0&q=80&w=1080', @author3_id, 'published', 76, 189000, 4.90, 31100),
  (@novel4_id, 'Senja di Kota Neon', 'senja-di-kota-neon', 'Di masa depan, seorang hacker menemukan konspirasi besar di balik kota utopia.', 'https://images.unsplash.com/photo-1715614176939-f5c46ae99d04?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2ktZmklMjBmdXR1cmlzdGljJTIwY2l0eSUyMG5lb258ZW58MXx8fHwxNzc2NTI0NzE0fDA&ixlib=rb-4.1.0&q=80&w=1080', @author4_id, 'published', 54, 135000, 4.50, 12800),
  (@novel5_id, 'Cinta Tak Kasatmata', 'cinta-tak-kasatmata', 'Kisah cinta yang tumbuh di antara dua jiwa yang tak pernah saling bertemu.', 'https://images.unsplash.com/photo-1699726256380-d1e393507b4b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb21hbnRpYyUyMHN1bnNldCUyMGNvdXBsZSUyMHNpbGhvdWV0dGV8ZW58MXx8fHwxNzc2NTI0NzEzfDA&ixlib=rb-4.1.0&q=80&w=1080', @author5_id, 'published', 120, 312000, 4.70, 28400),
  (@novel6_id, 'Perpustakaan Jiwa', 'perpustakaan-jiwa', 'Sebuah perpustakaan tua menyimpan rahasia kehidupan setiap pengunjungnya.', 'https://images.unsplash.com/photo-1553549277-2d63c5b8b2f7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjBib29rJTIwbGlicmFyeSUyMHJlYWRpbmd8ZW58MXx8fHwxNzc2NTI0NzE3fDA&ixlib=rb-4.1.0&q=80&w=1080', @author1_id, 'published', 67, 168000, 4.40, 9600),
  (@novel7_id, 'Hutan yang Berbisik', 'hutan-yang-berbisik', 'Sekelompok mahasiswa tersesat di hutan yang memiliki kehendaknya sendiri.', 'https://images.unsplash.com/photo-1723913961620-5d03606522f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3Jyb3IlMjBkYXJrJTIwZm9yZXN0JTIwY3JlZXB5fGVufDF8fHx8MTc3NjQzODA2MHww&ixlib=rb-4.1.0&q=80&w=1080', @author3_id, 'published', 45, 112000, 4.30, 15100),
  (@novel8_id, 'Kastil Kerajaan Terakhir', 'kastil-kerajaan-terakhir', 'Raja terakhir harus mempertahankan kerajaannya dari pasukan kegelapan.', 'https://images.unsplash.com/photo-1629238101092-5f39111de2c9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMGNhc3RsZSUyMGtpbmdkb218ZW58MXx8fHwxNzc2NTI0NzE4fDA&ixlib=rb-4.1.0&q=80&w=1080', @author2_id, 'published', 98, 245000, 4.60, 20300);

SET @genre_fantasy = (SELECT id FROM genres WHERE slug = 'fantasy');
SET @genre_adventure = (SELECT id FROM genres WHERE slug = 'adventure');
SET @genre_thriller = (SELECT id FROM genres WHERE slug = 'thriller');
SET @genre_romance = (SELECT id FROM genres WHERE slug = 'romance');
SET @genre_scifi = (SELECT id FROM genres WHERE slug = 'sci-fi');
SET @genre_horror = (SELECT id FROM genres WHERE slug = 'horror');
SET @genre_sol = (SELECT id FROM genres WHERE slug = 'slice-of-life');
SET @genre_drama = (SELECT id FROM genres WHERE slug = 'drama');

INSERT INTO novel_genres (novel_id, genre_id) VALUES
  (@novel1_id, @genre_fantasy),
  (@novel2_id, @genre_adventure),
  (@novel3_id, @genre_thriller),
  (@novel4_id, @genre_scifi),
  (@novel5_id, @genre_romance),
  (@novel6_id, @genre_sol),
  (@novel7_id, @genre_horror),
  (@novel8_id, @genre_fantasy),
  (@novel8_id, @genre_drama);

SET @ch1_id = UUID();
SET @ch2_id = UUID();
SET @ch3_id = UUID();
SET @ch4_id = UUID();
SET @ch5_id = UUID();
SET @ch6_id = UUID();
SET @ch7_id = UUID();
SET @ch8_id = UUID();
SET @ch9_id = UUID();
SET @ch10_id = UUID();
SET @ch11_id = UUID();
SET @ch12_id = UUID();

INSERT INTO chapters (id, novel_id, title, slug, content, chapter_number, word_count, is_published, order_index) VALUES
  (@ch1_id, @novel1_id, 'Bab 1: Awal Mula', 'bab-1-awal-mula', 'Di sebuah desa terpencil, hiduplah seorang pemuda yang memiliki mimpi besar. Ia selalu memandang langit malam dan bertanya-tanya apa yang ada di balik bintang-bintang itu.', 1, 3200, TRUE, 1),
  (@ch2_id, @novel1_id, 'Bab 2: Pertemuan', 'bab-2-pertemuan', 'Suatu hari, angin malam berhembus lembut, membawa aroma bunga yang mekar di taman belakang rumahnya. Ia menemukan sebuah buku sihir kuno di bawah pohon besar.', 2, 2800, TRUE, 2),
  (@ch3_id, @novel1_id, 'Bab 3: Penemuan', 'bab-3-penemuan', 'Buku itu berisi catatan tentang dimensi lain yang terhubung dengan dunia nyata. Pemuda itu menyadari bahwa bukunya bukan sekadar buku, melainkan pintu gerbang.', 3, 3500, TRUE, 3),
  (@ch4_id, @novel2_id, 'Bab 1: Peta Baru', 'bab-1-peta-baru', 'Perjalanan dimulai dari sebuah peta kuno yang ditemukan di perpustakaan tua. Peta itu menunjukkan jalan menuju artefak legendaris yang hilang selama berabad-abad.', 1, 2900, TRUE, 1),
  (@ch5_id, @novel2_id, 'Bab 2: Keberangkatan', 'bab-2-keberangkatan', 'Dengan peralatan seadanya, rombongan berangkat menuju hutan yang belum pernah dijamah. Setiap langkah membawa mereka lebih jauh dari zona nyaman.', 2, 3100, TRUE, 2),
  (@ch6_id, @novel3_id, 'Bab 1: Kasus Pertama', 'bab-1-kasus-pertama', 'Detektif muda menerima telepon pada tengah malam. Kasus pembunuhan pertama dari serangkaian pembunuhan berantai yang mengubah hidupnya selamanya.', 1, 2700, TRUE, 1),
  (@ch7_id, @novel3_id, 'Bab 2: Petunjuk', 'bab-2-petunjuk', 'Di tempat kejadian, ia menemukan sebuah buku catatan yang berisi simbol-simbol aneh. Setiap simbol tampak merujuk pada kenangan masa lalunya sendiri.', 2, 3300, TRUE, 2),
  (@ch8_id, @novel4_id, 'Bab 1: Glitch', 'bab-1-glitch', 'Di tahun 2147, kota Neo Jakarta tampak sempurna dari luar. Tapi di balik cahaya neon, seorang hacker menemukan anomali yang tidak seharusnya ada.', 1, 3000, TRUE, 1),
  (@ch9_id, @novel4_id, 'Bab 2: Konspirasi', 'bab-2-konspirasi', 'Data yang ditemukan mengarah pada satu kesimpulan: kota utopia itu adalah proyek eksperimen yang dikendalikan oleh satu entitas yang tidak dikenal.', 2, 2600, TRUE, 2),
  (@ch10_id, @novel5_id, 'Bab 1: Pertemuan', 'bab-1-pertemuan', 'Dua jiwa yang tak pernah saling bertemu berjalan di jalan yang sama setiap pagi. Mereka selalu menoleh ke arah yang berbeda, tapi nasib mereka sudah tertulis.', 1, 3400, TRUE, 1),
  (@ch11_id, @novel5_id, 'Bab 2: Jarak', 'bab-2-jarak', 'Jarak antara mereka hanya beberapa langkah, tapi terasa seperti lautan. Setiap hari mereka semakin dekat, tapi semakin tidak berani untuk berbicara.', 2, 3100, TRUE, 2),
  (@ch12_id, @novel6_id, 'Bab 1: Pintu Pertama', 'bab-1-pintu-pertama', 'Perpustakaan tua itu memiliki pintu yang tidak pernah terbuka. Sampai suatu hari, seorang pengunjung menemukan bahwa pintu itu hanya terbuka bagi mereka yang membutuhkan.', 1, 2800, TRUE, 1);

INSERT INTO chapters (id, novel_id, title, slug, content, chapter_number, word_count, is_published, order_index) VALUES
  (UUID(), @novel6_id, 'Bab 2: Buku Pertama', 'bab-2-buku-pertama', 'Buku pertama yang ia temukan berisi cerita tentang kehidupan setiap pengunjung perpustakaan. Setiap buku adalah catatan dari seseorang yang pernah datang.', 2, 2500, TRUE, 2),
  (UUID(), @novel6_id, 'Bab 3: Rahasia', 'bab-3-rahasia', 'Rahasia perpustakaan terungkap ketika ia membaca halaman terakhir buku ketiga. Ternyata perpustakaan itu adalah jembatan antara dunia nyata dan dunia lain.', 3, 3000, TRUE, 3),
  (UUID(), @novel7_id, 'Bab 1: Perjalanan', 'bab-1-perjalanan', 'Mahasiswa-mahasiswa itu memutuskan untuk berkemah di hutan yang angker. Mereka tidak tahu bahwa hutan itu memiliki kehendaknya sendiri.', 1, 2600, TRUE, 1),
  (UUID(), @novel7_id, 'Bab 2: Suara', 'bab-2-suara', 'Di malam pertama, mereka mendengar bisikan yang datang dari segala arah. Suara itu terdengar seperti panggilan, tapi entah dari mana asalnya.', 2, 2900, TRUE, 2),
  (UUID(), @novel8_id, 'Bab 1: Warisan', 'bab-1-warisan', 'Raja terakhir mewarisi kerajaan yang sedang dalam keadaan kacau. Pasukan kegelapan sudah mulai bergerak dari arah utara.', 1, 3200, TRUE, 1),
  (UUID(), @novel8_id, 'Bab 2: Pertahanan', 'bab-2-pertahanan', 'Ia mengumpulkan seluruh tentara yang tersisa dan mempersiapkan pertahanan terakhir. Keberanian bukan berarti tidak takut, tapi tetap bertahan meskipun takut.', 2, 3500, TRUE, 2);

SET @review1_id = UUID();
SET @review2_id = UUID();
SET @review3_id = UUID();
SET @review4_id = UUID();
SET @review5_id = UUID();

INSERT INTO reviews (id, novel_id, user_id, rating, title, content, likes_count) VALUES
  (@review1_id, @novel1_id, @reader1_id, 5, 'Salah satu novel fantasy terbaik', 'Salah satu novel fantasy terbaik yang pernah saya baca! World-building yang luar biasa detail dan karakter yang sangat relatable. Plot twist di bab 87 benar-benar tidak terduga. Highly recommended!', 42),
  (@review2_id, @novel3_id, @reader2_id, 5, 'Thriller yang membuat saya tidak bisa berhenti', 'Thriller yang membuat saya tidak bisa berhenti membaca! Suspense-nya terjaga dari awal sampai akhir. Penulisnya sangat pintar menyusun clue-clue tersembunyi.', 67),
  (@review3_id, @novel5_id, @reader3_id, 4, 'Cerita romansa yang sangat menyentuh', 'Cerita romansa yang sangat menyentuh hati. Penulis berhasil menggambarkan emosi dengan indah. Hanya saja, bagian tengah sedikit lambat. Tapi ending-nya sangat memuaskan!', 35),
  (@review4_id, @novel4_id, @reader1_id, 4, 'Konsep sci-fi yang segar dengan sentuhan lokal', 'Konsep sci-fi yang segar dengan sentuhan lokal Indonesia. Dunia futuristiknya terasa hidup dan detail teknologinya cukup meyakinkan. Karakter utamanya punya depth yang menarik.', 28),
  (@review5_id, @novel2_id, @reader2_id, 5, 'Petualangan yang epik', 'Petualangan yang epik! Setiap bab terasa seperti film action. Worldbuilding yang luas dan karakter pendukungnya juga sangat kuat. Tidak sabar menunggu season 2!', 51);

SET @like1_id = UUID();
SET @like2_id = UUID();
SET @like3_id = UUID();
SET @like4_id = UUID();
SET @like5_id = UUID();
SET @like6_id = UUID();
SET @like7_id = UUID();
SET @like8_id = UUID();
SET @like9_id = UUID();
SET @like10_id = UUID();

INSERT INTO review_likes (id, review_id, user_id) VALUES
  (@like1_id, @review1_id, @reader2_id),
  (@like2_id, @review1_id, @reader3_id),
  (@like3_id, @review2_id, @reader1_id),
  (@like4_id, @review2_id, @reader3_id),
  (@like5_id, @review3_id, @reader1_id),
  (@like6_id, @review3_id, @reader2_id),
  (@like7_id, @review4_id, @reader2_id),
  (@like8_id, @review4_id, @reader3_id),
  (@like9_id, @review5_id, @reader1_id),
  (@like10_id, @review5_id, @reader3_id);

SET @draft1_id = UUID();
SET @draft2_id = UUID();
SET @draft3_id = UUID();

INSERT INTO drafts (id, user_id, title, genre_id, content, chapter_count, word_count, status) VALUES
  (@draft1_id, @author1_id, 'Legenda Sang Pengelana', @genre_fantasy, 'Ini adalah konten dari "Legenda Sang Pengelana".

Bab 1: Awal Mula

Di sebuah desa terpencil, hiduplah seorang pemuda yang memiliki mimpi besar. Ia selalu memandang langit malam dan bertanya-tanya apa yang ada di balik bintang-bintang itu.', 12, 34500, 'draft'),
  (@draft2_id, @author3_id, 'Misteri Rumah Tua', @genre_thriller, 'Ini adalah konten dari "Misteri Rumah Tua".

Bab 1: Pindahan

Keluarga itu pindah ke rumah tua yang terbengkalai. Mereka tidak tahu bahwa rumah itu menyimpan rahasia yang belum pernah diceritakan siapa pun.', 8, 21200, 'draft'),
  (@draft3_id, @author5_id, 'Melodi di Balik Hujan', @genre_romance, 'Ini adalah konten dari "Melodi di Balik Hujan".

Bab 1: Pertemuan

Hujan turun di kota kecil itu. Di bawah kanopi sebuah kafe, dua jiwa yang saling melengkapi bertemu untuk pertama kalinya.', 24, 67800, 'published');

SET @bookmark1_id = UUID();
SET @bookmark2_id = UUID();
SET @bookmark3_id = UUID();
SET @bookmark4_id = UUID();

INSERT INTO bookmarks (id, user_id, novel_id) VALUES
  (@bookmark1_id, @reader1_id, @novel1_id),
  (@bookmark2_id, @reader1_id, @novel3_id),
  (@bookmark3_id, @reader2_id, @novel2_id),
  (@bookmark4_id, @reader3_id, @novel5_id);

SET @progress1_id = UUID();
SET @progress2_id = UUID();
SET @progress3_id = UUID();
SET @progress4_id = UUID();

INSERT INTO reading_progress (id, user_id, novel_id, last_chapter_id, progress_percent, last_read_at) VALUES
  (@progress1_id, @reader1_id, @novel1_id, @ch3_id, 45.50, '2026-07-26 20:30:00'),
  (@progress2_id, @reader2_id, @novel3_id, @ch7_id, 72.00, '2026-07-26 22:15:00'),
  (@progress3_id, @reader3_id, @novel5_id, @ch11_id, 60.00, '2026-07-25 18:45:00'),
  (@progress4_id, @reader1_id, @novel4_id, @ch9_id, 50.00, '2026-07-26 19:00:00');

SET @comment1_id = UUID();
SET @comment2_id = UUID();
SET @comment3_id = UUID();
SET @comment4_id = UUID();
SET @comment5_id = UUID();

INSERT INTO comments (id, review_id, user_id, content) VALUES
  (@comment1_id, @review1_id, @reader2_id, 'Setuju sekali! Plot twist-nya benar-benar unexpected.'),
  (@comment2_id, @review1_id, @reader3_id, 'Bab 87 yang kamu maksud, ya? Aku juga terkejut saat membacanya.'),
  (@comment3_id, @review2_id, @reader1_id, 'Budi, reviewmu selalu membuat aku ingin segera membaca bukunya!'),
  (@comment4_id, @review3_id, @reader2_id, 'Bagian tengah yang lambat itu justru membuat ending-nya lebih terasa.'),
  (@comment5_id, @review5_id, @reader3_id, 'Aku juga tidak sabar menunggu season 2! Penulisnya terlalu bagus.');