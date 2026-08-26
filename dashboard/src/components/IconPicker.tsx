// ============================================
// Djuniors Dashboard - Reusable Icon & Emoji Picker
// ============================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Sparkles,
  Trash2,
  ChevronDown,
  Shapes,
  Smile,
  Loader2,
} from 'lucide-react';
import { cmsIconsApi, CMSIcon } from '../utils/api';

export type IconPickerType = 'emoji' | 'svg' | 'all';

export interface IconPickerProps {
  value?: string;
  onChange: (value: string) => void;
  type?: IconPickerType;
  category?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  buttonClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  allowModeToggle?: boolean;
  style?: React.CSSProperties;
}

export interface EmojiItem {
  emoji: string;
  name: string;
  category: 'math' | 'kids' | 'education' | 'objects' | 'smileys' | 'food' | 'animals';
  keywords: string[];
}

// Curated 160+ Popular Emojis Categorized
export const POPULAR_EMOJIS: EmojiItem[] = [
  // --- Math ---
  { emoji: '🧮', name: 'Abacus / Sempoa', category: 'math', keywords: ['abacus', 'sempoa', 'hitung', 'math', 'kalkulator'] },
  { emoji: '🔢', name: 'Angka 1234', category: 'math', keywords: ['numbers', 'angka', 'digit', '1234', 'berhitung'] },
  { emoji: '➕', name: 'Tambah Plus', category: 'math', keywords: ['plus', 'tambah', 'penjumlahan', 'math'] },
  { emoji: '➖', name: 'Kurang Minus', category: 'math', keywords: ['minus', 'kurang', 'pengurangan', 'math'] },
  { emoji: '✖️', name: 'Kali Multiply', category: 'math', keywords: ['multiply', 'kali', 'perkalian', 'math'] },
  { emoji: '➗', name: 'Bagi Divide', category: 'math', keywords: ['divide', 'bagi', 'pembagian', 'math'] },
  { emoji: '📐', name: 'Penggaris Segitiga', category: 'math', keywords: ['triangular ruler', 'segitiga', 'geometri', 'sudut'] },
  { emoji: '📊', name: 'Grafik Batang', category: 'math', keywords: ['bar chart', 'grafik', 'statistik', 'data'] },
  { emoji: '📏', name: 'Penggaris Lurus', category: 'math', keywords: ['straight ruler', 'penggaris', 'ukur', 'panjang'] },
  { emoji: '💯', name: 'Seratus Poin', category: 'math', keywords: ['100', 'hundred', 'seratus', 'nilai', 'skor', 'sempurna'] },
  { emoji: '♾️', name: 'Tak Terhingga', category: 'math', keywords: ['infinity', 'unlimited', 'math', 'simbol'] },
  { emoji: '📈', name: 'Grafik Naik', category: 'math', keywords: ['chart increasing', 'naik', 'tumbuh', 'progres'] },
  { emoji: '📉', name: 'Grafik Turun', category: 'math', keywords: ['chart decreasing', 'turun'] },
  { emoji: '🪙', name: 'Koin Uang', category: 'math', keywords: ['coin', 'uang', 'koin', 'hitung', 'rupiah'] },
  { emoji: '🎲', name: 'Dadu Game', category: 'math', keywords: ['die', 'dice', 'peluang', 'probabilitas', 'permainan'] },
  { emoji: '🎯', name: 'Target Sasaran', category: 'math', keywords: ['bullseye', 'target', 'goal', 'fokus', 'tujuan'] },
  { emoji: '🧩', name: 'Puzzle Logika', category: 'math', keywords: ['puzzle', 'piece', 'teka teki', 'logika', 'asah otak'] },
  { emoji: '⚖️', name: 'Timbangan Neraca', category: 'math', keywords: ['balance scale', 'sama dengan', 'timbang', 'neraca'] },
  { emoji: '⏱️', name: 'Stopwatch', category: 'math', keywords: ['stopwatch', 'waktu', 'kecepatan', 'durasi'] },
  { emoji: '⏳', name: 'Jam Pasir Mengalir', category: 'math', keywords: ['hourglass flowing', 'waktu', 'countdown'] },
  { emoji: '⌛', name: 'Jam Pasir Selesai', category: 'math', keywords: ['hourglass done', 'waktu', 'selesai'] },
  { emoji: '0️⃣', name: 'Angka 0', category: 'math', keywords: ['0', 'nol', 'zero'] },
  { emoji: '1️⃣', name: 'Angka 1', category: 'math', keywords: ['1', 'satu', 'one'] },
  { emoji: '2️⃣', name: 'Angka 2', category: 'math', keywords: ['2', 'dua', 'two'] },
  { emoji: '3️⃣', name: 'Angka 3', category: 'math', keywords: ['3', 'tiga', 'three'] },
  { emoji: '4️⃣', name: 'Angka 4', category: 'math', keywords: ['4', 'empat', 'four'] },
  { emoji: '5️⃣', name: 'Angka 5', category: 'math', keywords: ['5', 'lima', 'five'] },
  { emoji: '6️⃣', name: 'Angka 6', category: 'math', keywords: ['6', 'enam', 'six'] },
  { emoji: '7️⃣', name: 'Angka 7', category: 'math', keywords: ['7', 'tujuh', 'seven'] },
  { emoji: '8️⃣', name: 'Angka 8', category: 'math', keywords: ['8', 'delapan', 'eight'] },
  { emoji: '9️⃣', name: 'Angka 9', category: 'math', keywords: ['9', 'sembilan', 'nine'] },
  { emoji: '🔟', name: 'Angka 10', category: 'math', keywords: ['10', 'sepuluh', 'ten'] },
  { emoji: '💲', name: 'Tanda Dolar / Harga', category: 'math', keywords: ['dollar', 'harga', 'biaya', 'bayar'] },

  // --- Kids ---
  { emoji: '👶', name: 'Bayi', category: 'kids', keywords: ['baby', 'bayi', 'balita', 'toddler'] },
  { emoji: '🧒', name: 'Anak Ceria', category: 'kids', keywords: ['child', 'anak', 'junior', 'ceria'] },
  { emoji: '👧', name: 'Anak Perempuan', category: 'kids', keywords: ['girl', 'anak cewek', 'putri'] },
  { emoji: '👦', name: 'Anak Laki-laki', category: 'kids', keywords: ['boy', 'anak cowok', 'putra'] },
  { emoji: '🍼', name: 'Botol Susu', category: 'kids', keywords: ['baby bottle', 'susu', 'nutrisi'] },
  { emoji: '🎒', name: 'Tas Ransel Sekolah', category: 'kids', keywords: ['backpack', 'tas', 'sekolah', 'perlengkapan'] },
  { emoji: '📚', name: 'Tumpukan Buku Belajar', category: 'kids', keywords: ['books', 'buku', 'baca', 'pelajaran'] },
  { emoji: '🎨', name: 'Palet Lukis / Seni', category: 'kids', keywords: ['artist palette', 'gambar', 'kreatif', 'warna', 'art'] },
  { emoji: '🧸', name: 'Boneka Teddy Bear', category: 'kids', keywords: ['teddy bear', 'mainan', 'lucu', 'boneka'] },
  { emoji: '🎈', name: 'Balon Pesta', category: 'kids', keywords: ['balloon', 'balon', 'ceria', 'pesta', 'ulang tahun'] },
  { emoji: '🪁', name: 'Layang-layang', category: 'kids', keywords: ['kite', 'layangan', 'terbang', 'outdoor'] },
  { emoji: '🎠', name: 'Komidi Putar Kuda', category: 'kids', keywords: ['carousel horse', 'wahana', 'bermain', 'taman'] },
  { emoji: '🎡', name: 'Bianglala', category: 'kids', keywords: ['ferris wheel', 'taman bermain', 'liburan'] },
  { emoji: '🎢', name: 'Roller Coaster', category: 'kids', keywords: ['roller coaster', 'wahana seru', 'tantangan'] },
  { emoji: '🎪', name: 'Tenda Sirkus', category: 'kids', keywords: ['circus tent', 'atraksi', 'pertunjukan'] },
  { emoji: '🪀', name: 'Yo-yo Mainan', category: 'kids', keywords: ['yo-yo', 'mainan', 'skill'] },
  { emoji: '🪅', name: 'Pinata Pesta', category: 'kids', keywords: ['pinata', 'pesta', 'kejutan', 'hadiah'] },
  { emoji: '🎮', name: 'Game Controller', category: 'kids', keywords: ['video game', 'bermain', 'gamifikasi', 'seru'] },
  { emoji: '🕹️', name: 'Joystick Arcade', category: 'kids', keywords: ['joystick', 'game', 'arcade'] },
  { emoji: '🪄', name: 'Tongkat Sihir', category: 'kids', keywords: ['magic wand', 'keajaiban', 'ajaib', 'trik'] },
  { emoji: '🦄', name: 'Unicorn Fantasi', category: 'kids', keywords: ['unicorn', 'kuda ajaib', 'lucu', 'dongeng'] },
  { emoji: '🌟', name: 'Bintang Bersinar', category: 'kids', keywords: ['glowing star', 'bintang', 'prestasi', 'hebat'] },
  { emoji: '⭐', name: 'Bintang Emas', category: 'kids', keywords: ['star', 'rating', 'bintang', 'favorit'] },
  { emoji: '✨', name: 'Kilauan Sparkles', category: 'kids', keywords: ['sparkles', 'kilau', 'baru', 'spesial', 'magic'] },
  { emoji: '🌈', name: 'Pelangi Indah', category: 'kids', keywords: ['rainbow', 'pelangi', 'warna-warni', 'ceria'] },
  { emoji: '🍭', name: 'Permen Lollipop', category: 'kids', keywords: ['lollipop', 'permen', 'manis', 'gula'] },
  { emoji: '🍬', name: 'Permen Candy', category: 'kids', keywords: ['candy', 'permen', 'snack'] },
  { emoji: '🍫', name: 'Cokelat Batang', category: 'kids', keywords: ['chocolate bar', 'cokelat', 'hadiah'] },
  { emoji: '🍦', name: 'Es Krim Cone', category: 'kids', keywords: ['ice cream', 'eskrim', 'segar'] },
  { emoji: '🐣', name: 'Anak Ayam Menetas', category: 'kids', keywords: ['hatching chick', 'menetas', 'awal'] },
  { emoji: '🐥', name: 'Anak Ayam Depan', category: 'kids', keywords: ['baby chick', 'lucu', 'muda'] },
  { emoji: '🤹', name: 'Juggling Sirkus', category: 'kids', keywords: ['juggling', 'keterampilan', 'atraksi'] },
  { emoji: '🛹', name: 'Skateboard', category: 'kids', keywords: ['skateboard', 'papan luncur', 'aktif'] },
  { emoji: '🛴', name: 'Skuter Anak', category: 'kids', keywords: ['kick scooter', 'skuter', 'gerak'] },
  { emoji: '🚲', name: 'Sepeda Gowes', category: 'kids', keywords: ['bicycle', 'sepeda', 'sehat'] },
  { emoji: '🚀', name: 'Roket Meluncur', category: 'kids', keywords: ['rocket', 'roket', 'cepat', 'meluncur', 'angkasa'] },

  // --- Education ---
  { emoji: '🎓', name: 'Topi Wisuda Kelulusan', category: 'education', keywords: ['graduation cap', 'wisuda', 'lulus', 'prestasi', 'sarjana'] },
  { emoji: '📖', name: 'Buku Terbuka', category: 'education', keywords: ['open book', 'baca', 'belajar', 'modul'] },
  { emoji: '✏️', name: 'Pensil Tulis', category: 'education', keywords: ['pencil', 'pensil', 'tulis', 'gambar'] },
  { emoji: '🏫', name: 'Gedung Sekolah', category: 'education', keywords: ['school', 'sekolah', 'gedung', 'kampus'] },
  { emoji: '🍎', name: 'Apel Guru', category: 'education', keywords: ['apple', 'apel', 'guru', 'sehat'] },
  { emoji: '💡', name: 'Ide Lampu Bohlam', category: 'education', keywords: ['light bulb', 'ide', 'solusi', 'inovasi', 'paham'] },
  { emoji: '📕', name: 'Buku Merah', category: 'education', keywords: ['closed book red', 'modul', 'materi'] },
  { emoji: '📗', name: 'Buku Hijau', category: 'education', keywords: ['green book', 'materi', 'panduan'] },
  { emoji: '📘', name: 'Buku Biru', category: 'education', keywords: ['blue book', 'buku', 'catatan'] },
  { emoji: '📙', name: 'Buku Oranye', category: 'education', keywords: ['orange book', 'catatan', 'latihan'] },
  { emoji: '📓', name: 'Buku Catatan Notebook', category: 'education', keywords: ['notebook', 'tugas', 'pr'] },
  { emoji: '📝', name: 'Memo Catatan Ujian', category: 'education', keywords: ['memo', 'catatan', 'ujian', 'tugas', 'tes'] },
  { emoji: '🖊️', name: 'Pulpen Pen', category: 'education', keywords: ['pen', 'pena', 'tinta'] },
  { emoji: '🖍️', name: 'Krayon Mewarnai', category: 'education', keywords: ['crayon', 'krayon', 'gambar', 'tk'] },
  { emoji: '🖌️', name: 'Kuas Cat Lukis', category: 'education', keywords: ['paintbrush', 'kuas', 'art'] },
  { emoji: '🔬', name: 'Mikroskop Sains', category: 'education', keywords: ['microscope', 'sains', 'penelitian', 'ipa'] },
  { emoji: '🔭', name: 'Teleskop Astronomi', category: 'education', keywords: ['telescope', 'bintang', 'angkasa', 'astronomi'] },
  { emoji: '🧪', name: 'Tabung Reaksi Kimia', category: 'education', keywords: ['test tube', 'eksperimen', 'laboratorium', 'sains'] },
  { emoji: '🧑‍🏫', name: 'Guru Pengajar', category: 'education', keywords: ['teacher', 'guru', 'tutor', 'mentor', 'pengajar'] },
  { emoji: '👨‍🏫', name: 'Guru Pria', category: 'education', keywords: ['man teacher', 'guru bapak', 'tutor'] },
  { emoji: '👩‍🏫', name: 'Guru Wanita', category: 'education', keywords: ['woman teacher', 'guru ibu', 'tutor'] },
  { emoji: '📜', name: 'Sertifikat Gulungan', category: 'education', keywords: ['scroll', 'piagam', 'ijazah', 'sertifikat'] },
  { emoji: '📋', name: 'Papan Klip Evaluasi', category: 'education', keywords: ['clipboard', 'evaluasi', 'kuis', 'rapor'] },
  { emoji: '📌', name: 'Pin Tusuk Pentul', category: 'education', keywords: ['pushpin', 'penting', 'pengumuman', 'info'] },
  { emoji: '📍', name: 'Pin Lokasi Bulat', category: 'education', keywords: ['round pushpin', 'lokasi', 'tempat'] },
  { emoji: '🧠', name: 'Otak Cerdas Logika', category: 'education', keywords: ['brain', 'otak', 'kreativitas', 'logika', 'iq'] },
  { emoji: '💻', name: 'Laptop Live Meet', category: 'education', keywords: ['laptop', 'online', 'daring', 'meet', 'google meet'] },
  { emoji: '🖥️', name: 'Komputer Desktop', category: 'education', keywords: ['desktop', 'komputer', 'layar'] },
  { emoji: '📱', name: 'Smartphone HP WhatsApp', category: 'education', keywords: ['mobile phone', 'hp', 'whatsapp', 'akses'] },
  { emoji: '🏆', name: 'Piala Juara Prestasi', category: 'education', keywords: ['trophy', 'piala', 'juara', 'pemenang', 'olimpiade'] },
  { emoji: '🥇', name: 'Medali Emas Juara 1', category: 'education', keywords: ['1st place medal', 'emas', 'juara 1', 'terbaik'] },
  { emoji: '🥈', name: 'Medali Perak Juara 2', category: 'education', keywords: ['2nd place medal', 'perak', 'juara 2'] },
  { emoji: '🥉', name: 'Medali Perunggu Juara 3', category: 'education', keywords: ['3rd place medal', 'perunggu', 'juara 3'] },
  { emoji: '🏅', name: 'Medali Lomba', category: 'education', keywords: ['sports medal', 'prestasi', 'lomba'] },
  { emoji: '🎖️', name: 'Medali Penghargaan', category: 'education', keywords: ['military medal', 'penghargaan', 'apresiasi'] },

  // --- Objects ---
  { emoji: '⭐', name: 'Bintang Prestasi', category: 'objects', keywords: ['star', 'bintang', 'favorit', 'top'] },
  { emoji: '🏆', name: 'Piala Juara', category: 'objects', keywords: ['trophy', 'piala', 'juara', 'pemenang'] },
  { emoji: '🎯', name: 'Target Fokus', category: 'objects', keywords: ['target', 'fokus', 'sasaran', 'tujuan'] },
  { emoji: '🎪', name: 'Sirkus Seru', category: 'objects', keywords: ['circus', 'sirkus', 'hiburan', 'tenda'] },
  { emoji: '🎨', name: 'Palet Seni', category: 'objects', keywords: ['art', 'seni', 'kreatif', 'lukis'] },
  { emoji: '🎵', name: 'Nada Musik', category: 'objects', keywords: ['music', 'musik', 'lagu', 'audio', 'irama'] },
  { emoji: '🎮', name: 'Joystick Game', category: 'objects', keywords: ['game', 'permainan', 'controller'] },
  { emoji: '🔔', name: 'Lonceng Notifikasi', category: 'objects', keywords: ['bell', 'lonceng', 'notif', 'pemberitahuan', 'ingat'] },
  { emoji: '📢', name: 'Pengeras Suara Megafon', category: 'objects', keywords: ['loudspeaker', 'info', 'pengumuman', 'suara'] },
  { emoji: '📣', name: 'Megaphone Sorak', category: 'objects', keywords: ['megaphone', 'sorak', 'dukungan'] },
  { emoji: '🎁', name: 'Kado Hadiah Gift', category: 'objects', keywords: ['wrapped gift', 'hadiah', 'kado', 'promo', 'bonus'] },
  { emoji: '📦', name: 'Paket Box Pengiriman', category: 'objects', keywords: ['package', 'paket', 'kirim', 'modul'] },
  { emoji: '🏷️', name: 'Label Tag Promo Diskon', category: 'objects', keywords: ['label', 'tag', 'diskon', 'promo', 'voucher', 'kupon'] },
  { emoji: '🔑', name: 'Kunci Akses Belajar', category: 'objects', keywords: ['key', 'kunci', 'akses', 'login', 'sukses'] },
  { emoji: '🔒', name: 'Gembok Terkunci Aman', category: 'objects', keywords: ['locked', 'aman', 'privasi', 'terlindungi'] },
  { emoji: '🚪', name: 'Pintu Masuk Kelas', category: 'objects', keywords: ['door', 'ruang kelas', 'buka'] },
  { emoji: '🛡️', name: 'Perisai Garansi Kualitas', category: 'objects', keywords: ['shield', 'keamanan', 'garansi', 'terpercaya'] },
  { emoji: '💎', name: 'Berlian Diamond Premium', category: 'objects', keywords: ['gem stone', 'berlian', 'premium', 'kualitas', 'vip'] },
  { emoji: '⚡', name: 'Petir Kilat Cepat', category: 'objects', keywords: ['high voltage', 'petir', 'kilat', 'flash sale', 'cepat'] },
  { emoji: '🔥', name: 'Api Semangat Hot Promo', category: 'objects', keywords: ['fire', 'api', 'populer', 'terlaris', 'hot', 'semangat'] },
  { emoji: '☀️', name: 'Matahari Bersinar Pagi', category: 'objects', keywords: ['sun', 'siang', 'cerah', 'pagi', 'semangat'] },
  { emoji: '🌙', name: 'Bulan Sabit Malam', category: 'objects', keywords: ['crescent moon', 'malam', 'istirahat'] },
  { emoji: '⏰', name: 'Jam Alarm Weker Jadwal', category: 'objects', keywords: ['alarm clock', 'jadwal', 'ingat', 'disiplin'] },
  { emoji: '📅', name: 'Kalender Tanggal Sesi', category: 'objects', keywords: ['calendar', 'jadwal', 'sesi', 'hari'] },
  { emoji: '💬', name: 'Gelembung Chat Tanya', category: 'objects', keywords: ['speech balloon', 'diskusi', 'tanya', 'komunikasi'] },
  { emoji: '💭', name: 'Balon Pikiran Ide', category: 'objects', keywords: ['thought balloon', 'ide', 'imajinasi', 'angan'] },
  { emoji: '✉️', name: 'Amplop Surat Email', category: 'objects', keywords: ['envelope', 'surat', 'pesan', 'email'] },
  { emoji: '🔍', name: 'Kaca Pembesar Cari', category: 'objects', keywords: ['magnifying glass', 'cari', 'eksplorasi', 'teliti'] },
  { emoji: '🛠️', name: 'Peralatan Tools Modul', category: 'objects', keywords: ['hammer and wrench', 'alat', 'modul', 'setting'] },
  { emoji: '⚙️', name: 'Roda Gigi Gear Sistem', category: 'objects', keywords: ['gear', 'pengaturan', 'mekanisme', 'otomatis'] },
  { emoji: '🧲', name: 'Magnet Daya Tarik', category: 'objects', keywords: ['magnet', 'daya tarik', 'sains'] },
  { emoji: '👑', name: 'Mahkota Juara Terbaik', category: 'objects', keywords: ['crown', 'mahkota', 'terbaik', 'king', 'queen'] },

  // --- Smileys ---
  { emoji: '😊', name: 'Senyum Hangat Tulus', category: 'smileys', keywords: ['smiling face', 'senyum', 'hangat', 'tulus', 'ramah'] },
  { emoji: '😍', name: 'Mata Hati Suka Sekali', category: 'smileys', keywords: ['heart eyes', 'suka sekali', 'kagum', 'cinta'] },
  { emoji: '🎉', name: 'Terompet Pesta Perayaan', category: 'smileys', keywords: ['party popper', 'selamat', 'pesta', 'hore'] },
  { emoji: '🥳', name: 'Pesta Perayaan Sukses', category: 'smileys', keywords: ['partying face', 'selamat', 'pesta', 'sukses', 'lulus'] },
  { emoji: '💪', name: 'Lengan Otot Semangat', category: 'smileys', keywords: ['flexed biceps', 'semangat', 'kuat', 'hebat', 'bisa'] },
  { emoji: '👍', name: 'Jempol Mantap Rekomendasi', category: 'smileys', keywords: ['thumbs up', 'mantap', 'setuju', 'oke', 'bagus'] },
  { emoji: '❤️', name: 'Hati Merah Kasih Sayang', category: 'smileys', keywords: ['red heart', 'cinta', 'sayang', 'love', 'favorit'] },
  { emoji: '😀', name: 'Wajah Senyum Lebar', category: 'smileys', keywords: ['grinning face', 'senyum', 'bahagia', 'senang'] },
  { emoji: '😃', name: 'Senyum Ceria Mata Besar', category: 'smileys', keywords: ['grinning face with big eyes', 'senang', 'antusias'] },
  { emoji: '😄', name: 'Senyum Bahagia Tertawa', category: 'smileys', keywords: ['grinning face with smiling eyes', 'tertawa', 'gembira'] },
  { emoji: '😁', name: 'Senyum Bangga Pamer Gigi', category: 'smileys', keywords: ['beaming face with smiling eyes', 'bangga', 'puas'] },
  { emoji: '😅', name: 'Senyum Lega Berhasil', category: 'smileys', keywords: ['grinning face with sweat', 'lega', 'tuntas'] },
  { emoji: '🤣', name: 'Tertawa Terpingkal Lucu', category: 'smileys', keywords: ['rolling on the floor laughing', 'lucu banget', 'kocak'] },
  { emoji: '😂', name: 'Tertawa Bahagia Haru', category: 'smileys', keywords: ['face with tears of joy', 'haru', 'terharu'] },
  { emoji: '🙂', name: 'Senyum Ramah Sahabat', category: 'smileys', keywords: ['slightly smiling face', 'ramah', 'tenang'] },
  { emoji: '😉', name: 'Mengedipkan Mata Semangat', category: 'smileys', keywords: ['winking face', 'kedip', 'semangat', 'sip'] },
  { emoji: '🥰', name: 'Penuh Kasih Sayang Cinta', category: 'smileys', keywords: ['smiling face with hearts', 'sayang', 'cinta', 'puas'] },
  { emoji: '🤩', name: 'Mata Bintang Terpukau Hebat', category: 'smileys', keywords: ['star-struck', 'terpukau', 'hebat', 'wow', 'takjub'] },
  { emoji: '🤗', name: 'Pelukan Hangat Menyambut', category: 'smileys', keywords: ['smiling face with open hands', 'peluk', 'terbuka', 'sambutan'] },
  { emoji: '🤔', name: 'Berpikir Analitis Kritis', category: 'smileys', keywords: ['thinking face', 'pikir', 'logika', 'solusi', 'hitung'] },
  { emoji: '😎', name: 'Keren Cerdas Percaya Diri', category: 'smileys', keywords: ['smiling face with sunglasses', 'keren', 'hebat', 'pede'] },
  { emoji: '🤓', name: 'Kutu Buku Pintar Juara Math', category: 'smileys', keywords: ['nerd face', 'pintar', 'matematika', 'ahli', 'jenius'] },
  { emoji: '🧐', name: 'Kacamata Monokel Teliti', category: 'smileys', keywords: ['face with monocle', 'teliti', 'fokus', 'amati'] },
  { emoji: '👌', name: 'Tangan Tanda OK Sempurna', category: 'smileys', keywords: ['ok hand', 'sempurna', 'pas', 'ok'] },
  { emoji: '✌️', name: 'Tanda Damai Kemenangan', category: 'smileys', keywords: ['victory hand', 'menang', 'damai', 'victory'] },
  { emoji: '👏', name: 'Tepuk Tangan Apresiasi', category: 'smileys', keywords: ['clapping hands', 'hebat', 'apresiasi', 'salut'] },
  { emoji: '🙌', name: 'Angkat Tangan Hore', category: 'smileys', keywords: ['raising hands', 'hore', 'syukur', 'semangat'] },
  { emoji: '🤝', name: 'Jabat Tangan Kerjasama Ramah', category: 'smileys', keywords: ['handshake', 'kerjasama', 'komitmen', 'partner'] },

  // --- Food (Bonus) ---
  { emoji: '🍏', name: 'Apel Hijau Segar', category: 'food', keywords: ['green apple', 'segar', 'buah'] },
  { emoji: '🍊', name: 'Jeruk Manis', category: 'food', keywords: ['tangerine', 'orange', 'jeruk', 'vitamin'] },
  { emoji: '🍌', name: 'Pisang Energi', category: 'food', keywords: ['banana', 'pisang', 'energi'] },
  { emoji: '🍉', name: 'Semangka Segar', category: 'food', keywords: ['watermelon', 'semangka', 'segar'] },
  { emoji: '🍓', name: 'Stroberi Merah', category: 'food', keywords: ['strawberry', 'stroberi', 'merah'] },
  { emoji: '🍩', name: 'Donat Cokelat', category: 'food', keywords: ['doughnut', 'donat', 'cokelat'] },
  { emoji: '🍪', name: 'Kue Biskuit Cookie', category: 'food', keywords: ['cookie', 'biskuit', 'chocochip'] },
  { emoji: '🎂', name: 'Kue Ulang Tahun Tart', category: 'food', keywords: ['birthday cake', 'ultah', 'pesta', 'kue'] },

  // --- Animals (Bonus) ---
  { emoji: '🐶', name: 'Anjing Lucu', category: 'animals', keywords: ['dog', 'anjing', 'guguk', 'setia'] },
  { emoji: '🐱', name: 'Kucing Imut', category: 'animals', keywords: ['cat', 'kucing', 'meong', 'imut'] },
  { emoji: '🐰', name: 'Kelinci Lompat', category: 'animals', keywords: ['rabbit', 'kelinci', 'lompat'] },
  { emoji: '🦊', name: 'Rubah Cerdas', category: 'animals', keywords: ['fox', 'rubah', 'cerdas'] },
  { emoji: '🐼', name: 'Panda Lucu', category: 'animals', keywords: ['panda', 'hewan', 'bambu'] },
  { emoji: '🦁', name: 'Singa Berani', category: 'animals', keywords: ['lion', 'singa', 'pemimpin'] },
  { emoji: '🦉', name: 'Burung Hantu Bijaksana', category: 'animals', keywords: ['owl', 'burung hantu', 'bijak', 'belajar'] },
  { emoji: '🐬', name: 'Lumba-lumba Cerdas', category: 'animals', keywords: ['dolphin', 'lumba-lumba', 'pintar'] },
];

// Fallback SVG Icons (30 Lucide Icons: Math, Kids, Education, Objects - ISC License)
export const FALLBACK_SVG_ICONS: CMSIcon[] = [
  // --- Math (6) ---
  {
    id: 'icon-calculator',
    name: 'Kalkulator',
    category: 'math',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" x2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-sigma',
    name: 'Sigma Total',
    category: 'math',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 7V4H6l6 8-6 8h12v-3"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-percent',
    name: 'Persentase',
    category: 'math',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-divide',
    name: 'Pembagian',
    category: 'math',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="1"/><line x1="5" x2="19" y1="12" y2="12"/><circle cx="12" cy="18" r="1"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-equals',
    name: 'Sama Dengan',
    category: 'math',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" x2="19" y1="9" y2="9"/><line x1="5" x2="19" y1="15" y2="15"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-pi',
    name: 'Pi Matematika',
    category: 'math',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="10" y2="10"/><path d="M4 10V6a2 2 0 0 1 2-2h12"/><path d="M8 10v8"/><path d="M16 10v4"/></svg>',
    is_active: true,
  },

  // --- Kids (8) ---
  {
    id: 'icon-baby',
    name: 'Bayi / Balita',
    category: 'kids',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-smile',
    name: 'Senyum Ceria',
    category: 'kids',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-party-popper',
    name: 'Terompet Pesta',
    category: 'kids',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-balloon',
    name: 'Balon Ceria',
    category: 'kids',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M13 17h-2"/><path d="M12 2C8.8 2 6.2 4.6 6.2 7.9c0 2.6 1.7 4.6 3.3 5.9.7.6 1 1.4 1.1 2.2h2.8c.1-.8.4-1.6 1.1-2.2 1.6-1.3 3.3-3.3 3.3-5.9C17.8 4.6 15.2 2 12 2Z"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-puzzle',
    name: 'Puzzle Logika',
    category: 'kids',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.439 7.85c-.049.322.18.633.5.633h2.331a1 1 0 0 1 1 1v3.23a1 1 0 0 1-1 1h-2.995a.6.6 0 0 0-.442.193l-2.592 2.85a.6.6 0 0 0-.153.402V21a1 1 0 0 1-1 1h-3.23a1 1 0 0 1-1-1v-2.63a.6.6 0 0 0-.153-.403L8.65 15.1a.6.6 0 0 0-.442-.193H5.23a1 1 0 0 1-1-1v-3.23a1 1 0 0 1 1-1h2.33c.322 0 .55-.311.5-.633A3.996 3.996 0 0 1 12 2c2.2 0 4 1.8 4 4 0 .62-.163 1.207-.561 1.85Z"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-gamepad-2',
    name: 'Gamepad Game',
    category: 'kids',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-rocket',
    name: 'Roket Meluncur',
    category: 'kids',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-star',
    name: 'Bintang Prestasi',
    category: 'kids',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    is_active: true,
  },

  // --- Education (8) ---
  {
    id: 'icon-book-open',
    name: 'Buku Terbuka',
    category: 'education',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-graduation-cap',
    name: 'Topi Wisuda',
    category: 'education',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-school',
    name: 'Sekolah',
    category: 'education',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m4 9-2-4 10-3 10 3-2 4"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-pencil',
    name: 'Pensil Belajar',
    category: 'education',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-lightbulb',
    name: 'Ide Bohlam',
    category: 'education',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-brain',
    name: 'Otak Cerdas',
    category: 'education',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-award',
    name: 'Penghargaan',
    category: 'education',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-trophy',
    name: 'Piala Juara',
    category: 'education',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
    is_active: true,
  },

  // --- Objects (8) ---
  {
    id: 'icon-clock',
    name: 'Jam Waktu',
    category: 'objects',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-globe',
    name: 'Globe Dunia',
    category: 'objects',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-heart',
    name: 'Hati Kasih',
    category: 'objects',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-target',
    name: 'Target Sasaran',
    category: 'objects',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-zap',
    name: 'Petir Kilat',
    category: 'objects',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-gift',
    name: 'Kado Hadiah',
    category: 'objects',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-video',
    name: 'Video Live',
    category: 'objects',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>',
    is_active: true,
  },
  {
    id: 'icon-users',
    name: 'Pengguna Grup',
    category: 'objects',
    svg_code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    is_active: true,
  },
];

/**
 * Render SVG string as an inline React element with proper sizing, stroke, and fill overrides
 */
export const renderSvgIcon = (
  svgCode: string,
  size: number = 24,
  strokeColor: string = '#111827',
  className?: string
): React.ReactNode => {
  if (!svgCode) return null;
  const trimmed = svgCode.trim();

  // Try parsing with DOMParser
  try {
    if (typeof window !== 'undefined' && window.DOMParser) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');

      if (svgEl && !doc.querySelector('parsererror')) {
        // Set explicit dimensions & overflow
        svgEl.setAttribute('width', String(size));
        svgEl.setAttribute('height', String(size));
        svgEl.style.overflow = 'visible';
        svgEl.style.display = 'block';

        // Ensure viewBox exists
        if (!svgEl.getAttribute('viewBox')) {
          const w = svgEl.getAttribute('width') || String(size);
          const h = svgEl.getAttribute('height') || String(size);
          svgEl.setAttribute('viewBox', `0 0 ${parseInt(w, 10) || 24} ${parseInt(h, 10) || 24}`);
        }

        // Check fill on root <svg>
        const rootFill = svgEl.getAttribute('fill');
        if (!rootFill || rootFill === 'currentColor' || rootFill === '#000000' || rootFill === '#000' || rootFill === 'black') {
          svgEl.setAttribute('fill', 'none');
        }

        // Check stroke on root <svg>
        const rootStroke = svgEl.getAttribute('stroke');
        if (!rootStroke || rootStroke === 'currentColor' || rootStroke === 'none' || rootStroke === '#2D3436') {
          svgEl.setAttribute('stroke', strokeColor);
        }
        if (!svgEl.getAttribute('stroke-width')) {
          svgEl.setAttribute('stroke-width', '2');
        }
        if (!svgEl.getAttribute('stroke-linecap')) {
          svgEl.setAttribute('stroke-linecap', 'round');
        }
        if (!svgEl.getAttribute('stroke-linejoin')) {
          svgEl.setAttribute('stroke-linejoin', 'round');
        }

        // Sanitize all shape children to avoid black fills
        const childShapes = svgEl.querySelectorAll('path, rect, circle, line, polygon, polyline, ellipse');
        childShapes.forEach((el) => {
          const fill = el.getAttribute('fill');
          if (fill === 'currentColor' || fill === '#000000' || fill === '#000' || fill === 'black') {
            el.setAttribute('fill', 'none');
          }
          const stroke = el.getAttribute('stroke');
          if (stroke === 'currentColor' || stroke === '#2D3436') {
            el.setAttribute('stroke', strokeColor);
          }
        });

        return (
          <span
            className={`svg-icon-wrapper ${className || ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: `${size}px`,
              height: `${size}px`,
              flexShrink: 0,
              backgroundColor: 'transparent',
              color: strokeColor,
            }}
            dangerouslySetInnerHTML={{ __html: svgEl.outerHTML }}
          />
        );
      }
    }
  } catch (e) {
    console.warn('DOMParser error, fallback to string replacement:', e);
  }

  // Fallback regex if DOMParser fails or in SSR
  let sizedSvg = trimmed
    .replace(/width="[^"]*"/g, `width="${size}"`)
    .replace(/height="[^"]*"/g, `height="${size}"`);

  if (!sizedSvg.includes(`width="${size}"`)) {
    sizedSvg = sizedSvg.replace(/<svg\b/, `<svg width="${size}" height="${size}"`);
  }

  sizedSvg = sizedSvg
    .replace(/stroke="currentColor"/gi, `stroke="${strokeColor}"`)
    .replace(/stroke='currentColor'/gi, `stroke="${strokeColor}"`)
    .replace(/stroke="#2D3436"/gi, `stroke="${strokeColor}"`)
    .replace(/stroke='#2D3436'/gi, `stroke="${strokeColor}"`);

  return (
    <span
      className={`svg-icon-wrapper ${className || ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        backgroundColor: 'transparent',
        color: strokeColor,
      }}
      dangerouslySetInnerHTML={{ __html: sizedSvg }}
    />
  );
};

/**
 * Universal helper to render icon / emoji / SVG code or SVG ID cleanly
 */
export const renderIconPreview = (
  iconValue?: string,
  size: number = 24,
  className?: string,
  iconsPool: CMSIcon[] = FALLBACK_SVG_ICONS,
  color: string = '#111827'
): React.ReactNode => {
  if (!iconValue) return null;

  const trimmed = iconValue.trim();

  // If it's direct SVG markup
  if (trimmed.startsWith('<svg') || trimmed.includes('</svg>')) {
    return renderSvgIcon(trimmed, size, color, className);
  }

  // If it's an SVG ID reference (e.g. icon-calculator)
  if (trimmed.startsWith('icon-') || trimmed.startsWith('svg-')) {
    const found = iconsPool.find((i) => i.id === trimmed);
    if (found?.svg_code) {
      return renderSvgIcon(found.svg_code, size, color, className);
    }
  }

  // Regular Emoji or Text
  return (
    <span
      className={className}
      style={{
        fontSize: `${size}px`,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        flexShrink: 0,
        backgroundColor: 'transparent',
      }}
    >
      {trimmed}
    </span>
  );
};

export const IconPicker: React.FC<IconPickerProps> = ({
  value = '',
  onChange,
  type = 'emoji',
  category,
  placeholder = 'Pilih Icon...',
  label,
  disabled = false,
  buttonClassName = '',
  size = 'md',
  allowModeToggle = true,
  style,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<'emoji' | 'svg'>(
    type === 'svg' ? 'svg' : 'emoji'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(category || 'all');
  const [svgIcons, setSvgIcons] = useState<CMSIcon[]>(FALLBACK_SVG_ICONS);
  const [isLoadingSvg, setIsLoadingSvg] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync mode with type prop
  useEffect(() => {
    if (type === 'emoji') setActiveMode('emoji');
    else if (type === 'svg') setActiveMode('svg');
  }, [type]);

  // Load SVG Icons from API (/api/cms/icons)
  useEffect(() => {
    let isMounted = true;
    const fetchIcons = async () => {
      try {
        setIsLoadingSvg(true);
        const res = await cmsIconsApi.getAll();
        if (isMounted && res && Array.isArray(res.icons) && res.icons.length > 0) {
          const apiIds = new Set(res.icons.map((i) => i.id || i.name));
          const filteredFallbacks = FALLBACK_SVG_ICONS.filter(
            (f) => !apiIds.has(f.id) && !apiIds.has(f.name)
          );
          setSvgIcons([...res.icons, ...filteredFallbacks]);
        }
      } catch (err) {
        console.warn('Could not load dynamic CMS icons, using fallbacks:', err);
      } finally {
        if (isMounted) setIsLoadingSvg(false);
      }
    };

    fetchIcons();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle outside click & escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Emoji Categories
  const emojiCategories = useMemo(
    () => [
      { id: 'all', label: '✨ Semua' },
      { id: 'math', label: '🧮 Math' },
      { id: 'kids', label: '👶 Kids' },
      { id: 'education', label: '🎓 Education' },
      { id: 'objects', label: '⭐ Objects' },
      { id: 'smileys', label: '😊 Smileys' },
      { id: 'food', label: '🍎 Food' },
      { id: 'animals', label: '🐶 Animals' },
    ],
    []
  );

  // SVG Categories
  const svgCategories = useMemo(() => {
    const cats = new Set<string>();
    svgIcons.forEach((icon) => {
      if (icon.category) cats.add(icon.category);
    });
    const list = [{ id: 'all', label: '✨ Semua' }];
    Array.from(cats).sort().forEach((cat) => {
      let iconPrefix = '📁';
      if (cat === 'math') iconPrefix = '🧮';
      else if (cat === 'kids') iconPrefix = '👶';
      else if (cat === 'education') iconPrefix = '🎓';
      else if (cat === 'objects' || cat === 'general') iconPrefix = '⭐';
      else if (cat === 'smileys') iconPrefix = '😊';
      list.push({
        id: cat,
        label: `${iconPrefix} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
      });
    });
    return list;
  }, [svgIcons]);

  // Filter Emojis
  const filteredEmojis = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return POPULAR_EMOJIS.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCat) return false;
      if (!query) return true;

      return (
        item.emoji.includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.keywords.some((k) => k.toLowerCase().includes(query))
      );
    });
  }, [searchQuery, selectedCategory]);

  // Filter SVG Icons
  const filteredSvgIcons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return svgIcons.filter((icon) => {
      const matchCat =
        selectedCategory === 'all' ||
        (icon.category && icon.category.toLowerCase() === selectedCategory.toLowerCase());
      if (!matchCat) return false;
      if (!query) return true;

      return (
        icon.name.toLowerCase().includes(query) ||
        (icon.category && icon.category.toLowerCase().includes(query)) ||
        (icon.id && icon.id.toLowerCase().includes(query))
      );
    });
  }, [svgIcons, searchQuery, selectedCategory]);

  // Size styling map
  const sizeStyles = {
    sm: { height: '34px', fontSize: '0.85rem', iconSize: 18, padding: '0.35rem 0.6rem' },
    md: { height: '42px', fontSize: '0.9rem', iconSize: 22, padding: '0.5rem 0.75rem' },
    lg: { height: '48px', fontSize: '1rem', iconSize: 26, padding: '0.65rem 1rem' },
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const isValueSvg = Boolean(
    value &&
      (value.trim().startsWith('<svg') ||
        value.includes('</svg>') ||
        value.startsWith('icon-') ||
        value.startsWith('svg-'))
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '100%',
        ...style,
      }}
      className="icon-picker-root"
    >
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '0.825rem',
            fontWeight: 700,
            color: '#475569',
            marginBottom: '0.35rem',
          }}
        >
          {label}
        </label>
      )}

      {/* Button Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`icon-picker-trigger-btn ${buttonClassName}`}
        style={{
          width: '100%',
          minHeight: currentSize.height,
          padding: currentSize.padding,
          borderRadius: '8px',
          border: isOpen ? '1.5px solid #4A90D9' : '1px solid #CBD5E1',
          backgroundColor: disabled ? '#F1F5F9' : '#FFFFFF',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(74, 144, 217, 0.15)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {value ? (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#1E40AF',
              }}
            >
              {renderIconPreview(value, currentSize.iconSize, undefined, svgIcons)}
            </div>
          ) : (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#94A3B8',
              }}
            >
              <Smile size={16} />
            </div>
          )}

          <span
            style={{
              fontSize: currentSize.fontSize,
              fontWeight: value ? 600 : 400,
              color: value ? '#1E293B' : '#94A3B8',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {value ? (isValueSvg ? 'SVG Icon Terpilih' : value) : placeholder}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {value && !disabled && (
            <span
              onClick={handleClear}
              title="Hapus icon"
              style={{
                padding: '2px 4px',
                borderRadius: '4px',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            style={{
              color: '#64748B',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </button>

      {/* Dropdown Popup */}
      {isOpen && (
        <div
          className="icon-picker-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 9999,
            width: '320px',
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.15), 0 6px 12px -4px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header & Tabs Toggle */}
          <div
            style={{
              padding: '0.6rem 0.75rem',
              borderBottom: '1px solid #F1F5F9',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            {allowModeToggle && type !== 'emoji' && type !== 'svg' ? (
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#E2E8F0',
                  padding: '2px',
                  borderRadius: '8px',
                  gap: '2px',
                  flex: 1,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('emoji');
                    setSelectedCategory('all');
                  }}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    backgroundColor: activeMode === 'emoji' ? '#FFFFFF' : 'transparent',
                    color: activeMode === 'emoji' ? '#1E293B' : '#64748B',
                    boxShadow: activeMode === 'emoji' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Smile size={13} /> Emoji
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('svg');
                    setSelectedCategory('all');
                  }}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    backgroundColor: activeMode === 'svg' ? '#FFFFFF' : 'transparent',
                    color: activeMode === 'svg' ? '#1E293B' : '#64748B',
                    boxShadow: activeMode === 'svg' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Shapes size={13} /> SVG Icon
                </button>
              </div>
            ) : allowModeToggle ? (
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#E2E8F0',
                  padding: '2px',
                  borderRadius: '8px',
                  gap: '2px',
                  flex: 1,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('emoji');
                    setSelectedCategory('all');
                  }}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    backgroundColor: activeMode === 'emoji' ? '#FFFFFF' : 'transparent',
                    color: activeMode === 'emoji' ? '#1E293B' : '#64748B',
                    boxShadow: activeMode === 'emoji' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Smile size={13} /> Emoji
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('svg');
                    setSelectedCategory('all');
                  }}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    backgroundColor: activeMode === 'svg' ? '#FFFFFF' : 'transparent',
                    color: activeMode === 'svg' ? '#1E293B' : '#64748B',
                    boxShadow: activeMode === 'svg' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Shapes size={13} /> SVG Icon
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="#4A90D9" />
                {activeMode === 'emoji' ? 'Pilih Emoji' : 'Pilih Icon SVG'}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <X size={15} />
            </button>
          </div>

          {/* Search Input */}
          <div style={{ padding: '0.5rem 0.6rem 0.35rem 0.6rem' }}>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '9px',
                  color: '#94A3B8',
                  pointerEvents: 'none',
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeMode === 'emoji'
                    ? 'Cari emoji (math, kids, star)...'
                    : 'Cari icon SVG...'
                }
                style={{
                  width: '100%',
                  padding: '0.4rem 1.6rem 0.4rem 1.8rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.8rem',
                  outline: 'none',
                  backgroundColor: '#F8FAFC',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#4A90D9')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div
            className="icon-picker-category-scroll"
            style={{
              display: 'flex',
              gap: '4px',
              padding: '0.25rem 0.6rem 0.4rem 0.6rem',
              overflowX: 'auto',
              borderBottom: '1px solid #F1F5F9',
              scrollbarWidth: 'none',
            }}
          >
            {(activeMode === 'emoji' ? emojiCategories : svgCategories).map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '16px',
                    border: isSelected ? '1px solid #4A90D9' : '1px solid transparent',
                    backgroundColor: isSelected ? '#EFF6FF' : '#F1F5F9',
                    color: isSelected ? '#1D4ED8' : '#64748B',
                    fontSize: '0.72rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Grid Area: 8 Columns, 32px Icons, 4px Gap */}
          <div
            style={{
              padding: '0.5rem 0.6rem',
              minHeight: '180px',
            }}
          >
            {activeMode === 'emoji' ? (
              filteredEmojis.length > 0 ? (
                <div
                  className="icon-picker-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: '4px',
                  }}
                >
                  {filteredEmojis.map((item, idx) => {
                    const isSelected = value === item.emoji;
                    return (
                      <button
                        key={`${item.emoji}-${idx}`}
                        type="button"
                        onClick={() => handleSelect(item.emoji)}
                        title={item.name}
                        className={`icon-picker-item ${isSelected ? 'selected' : ''}`}
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #3B82F6' : '1px solid transparent',
                          backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '20px',
                          padding: 0,
                          transition: 'all 0.12s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#F1F5F9';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span style={{ lineHeight: 1 }}>{item.emoji}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    color: '#94A3B8',
                    fontSize: '0.8rem',
                  }}
                >
                  <p style={{ margin: 0 }}>Tidak ada emoji yang cocok</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    style={{
                      marginTop: '6px',
                      background: 'none',
                      border: 'none',
                      color: '#4A90D9',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Reset Filter
                  </button>
                </div>
              )
            ) : isLoadingSvg ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2.5rem 1rem',
                  color: '#64748B',
                  gap: '8px',
                }}
              >
                <Loader2 size={24} className="animate-spin" color="#4A90D9" />
                <span style={{ fontSize: '0.8rem' }}>Memuat icon SVG...</span>
              </div>
            ) : filteredSvgIcons.length > 0 ? (
              <div
                className="icon-picker-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: '4px',
                }}
              >
                {filteredSvgIcons.map((icon, idx) => {
                  const isSelected =
                    value === icon.id ||
                    value === icon.svg_code ||
                    (icon.id && value === `icon-${icon.id}`);
                  // Vibrant colors per icon (rotating palette)
                  const VIBRANT_COLORS = ['#E11D48', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
                  const iconColor = VIBRANT_COLORS[idx % VIBRANT_COLORS.length];
                  return (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => handleSelect(icon.svg_code || icon.id)}
                      title={icon.name}
                      className={`icon-picker-item ${isSelected ? 'selected' : ''}`}
                      style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #3B82F6' : '1px solid transparent',
                        backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                        color: iconColor,
                        cursor: 'pointer',
                        padding: '4px',
                        transition: 'all 0.12s ease',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#F1F5F9';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {renderIconPreview(icon.svg_code || icon.id, 20, undefined, svgIcons, iconColor)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  color: '#94A3B8',
                  fontSize: '0.8rem',
                }}
              >
                <p style={{ margin: 0 }}>Tidak ada icon SVG yang cocok</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  style={{
                    marginTop: '6px',
                    background: 'none',
                    border: 'none',
                    color: '#4A90D9',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Reset Filter
                </button>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div
            style={{
              padding: '0.45rem 0.65rem',
              borderTop: '1px solid #F1F5F9',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#64748B',
              marginTop: 'auto',
              position: 'sticky',
              bottom: 0,
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {value ? (
                <>
                  <span style={{ fontSize: '0.7rem' }}>Terpilih:</span>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: '#FFFFFF',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E1',
                      color: '#111827',
                    }}
                  >
                    {renderIconPreview(value, 16, undefined, svgIcons)}
                  </div>
                </>
              ) : (
                <span style={{ fontSize: '0.7rem' }}>Belum ada pilihan</span>
              )}
            </div>

            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#EF4444',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px 5px',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Trash2 size={12} /> Hapus
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IconPicker;
