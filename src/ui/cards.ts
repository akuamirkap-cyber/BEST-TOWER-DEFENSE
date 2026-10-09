import { towerStatsOf, upgradeCostOf, PIGGY, TOWER_DEFS, BARRACKS, MINDC } from '../game/engine';
import type { TowerType } from '../game/engine';

/** what the card-info popup shows for each tower: strength bars (1-5), skills, good / weak matchups and a tip.
 *  Numbers per level are NOT typed in – they are computed from the same functions the game uses (towerStatsOf, PIGGY, ...). */
export interface Skill { icon: string; title: string; text: string }
export interface Bar { label: string; v: number }
export interface Row { label: string; vals: [string, string, string] }
export interface CardData {
  role: string; bars: Bar[]; skills: Skill[]; good: string[]; weak: string[]; tip: string;
  /** replaces the automatic Damage / Jangkauan / Tembakan rows */
  rows?: Row[];
  /** appended after the automatic rows */
  extra?: Row[];
  rateLabel?: string;
}

const L3 = (f: (l: number) => string): [string, string, string] => [f(1), f(2), f(3)];
const f1 = (n: number) => n.toFixed(1);
const range = (type: TowerType): Row => ({ label: 'Jangkauan', vals: L3(l => f1(towerStatsOf(type, l).range)) });

export const CARD_INFO: Record<TowerType, CardData> = {
  cannon: {
    role: 'Penembak serbaguna', bars: [{ label: 'Kekuatan', v: 3 }, { label: 'Jangkauan', v: 2 }, { label: 'Kecepatan', v: 5 }],
    skills: [{ icon: '🎯', title: 'Tembak Cepat', text: 'Menembak orc terdepan tanpa henti. Murah dan jadi andalan di awal permainan.' }, { icon: '🚫', title: 'Hanya Darat', text: 'Tidak bisa menembak musuh yang terbang.' }],
    good: ['Orc biasa', 'Goblin', 'Orc Popok'], weak: ['Musuh terbang', 'Armor tebal'], tip: 'Taruh dekat tikungan supaya sempat menembak lebih lama.',
  },
  frost: {
    role: 'Pelambat', bars: [{ label: 'Kekuatan', v: 1 }, { label: 'Jangkauan', v: 2 }, { label: 'Kecepatan', v: 5 }],
    skills: [{ icon: '❄️', title: 'Sinar Beku', text: 'Sinar terus-menerus memperlambat orc 50% selama masih terkena.' }, { icon: '🦅', title: 'Darat & Udara', text: 'Bisa memperlambat naga dan balon juga.' }],
    good: ['Berserker', 'Naga', 'Orc cepat'], weak: ['Armor tebal (damage kecil)'], tip: 'Pasangkan dengan Mortir: musuh lambat berarti semua peluru kena.',
  },
  blaster: {
    role: 'Serangan area', bars: [{ label: 'Kekuatan', v: 4 }, { label: 'Jangkauan', v: 4 }, { label: 'Kecepatan', v: 2 }],
    skills: [{ icon: '💥', title: 'Ledakan Area', text: 'Peluru melengkung meledak dan melukai semua orc darat dalam radius ±1,3 petak.' }, { icon: '🚫', title: 'Hanya Darat', text: 'Peluru tidak mengenai musuh yang terbang.' }],
    good: ['Gerombolan padat', 'Gelondongan'], weak: ['Musuh terbang', 'Orc yang menyebar'], tip: 'Taruh di tempat orc menumpuk, misalnya setelah tikungan.',
  },
  tesla: {
    role: 'Petir berantai', bars: [{ label: 'Kekuatan', v: 3 }, { label: 'Jangkauan', v: 2 }, { label: 'Kecepatan', v: 3 }],
    skills: [{ icon: '⚡', title: 'Petir Berantai', text: 'Petir melompat ke 3 orc (Lv2: 4, Lv3: 5). Damage berkurang 20% tiap lompatan.' }, { icon: '🦅', title: 'Darat & Udara', text: 'Bisa menyambar musuh terbang.' }],
    good: ['Kerumunan', 'Balon'], weak: ['Satu orc berarmor tebal'], tip: 'Makin rapat musuhnya, makin hebat petirnya.',
    extra: [{ label: 'Lompatan', vals: ['3 orc', '4 orc', '5 orc'] }],
  },
  sniper: {
    role: 'Penembak jitu', bars: [{ label: 'Kekuatan', v: 5 }, { label: 'Jangkauan', v: 5 }, { label: 'Kecepatan', v: 1 }],
    skills: [{ icon: '🎯', title: 'Tembus Armor', text: 'Mengabaikan armor dan memberi damage ×1,4 pada musuh berarmor.' }, { icon: '💨', title: 'Dorong Mundur', text: 'Orc biasa terdorong ±0,5 petak ke belakang (bos & naga kebal).' }, { icon: '🔭', title: 'Jangkauan Terjauh', text: 'Menembak dari jarak 5,2 petak: paling jauh dari semua tower.' }],
    good: ['Tank', 'Ksatria Kelam', 'Panglima', 'Naga'], weak: ['Banyak musuh sekaligus (lambat)'], tip: 'Taruh di tengah peta supaya mencakup banyak ruas jalan.',
  },
  poison: {
    role: 'Racun berkelanjutan', bars: [{ label: 'Kekuatan', v: 3 }, { label: 'Jangkauan', v: 3 }, { label: 'Kecepatan', v: 2 }],
    skills: [{ icon: '☠️', title: 'Genangan Racun', text: 'Bola racun meninggalkan genangan yang melukai orc darat tiap detik, menembus armor.' }, { icon: '🧪', title: 'Racun Menempel', text: 'Orc yang terkena tetap teracun 3 detik setelah keluar dari genangan.' }],
    good: ['Armor tebal', 'Pasukan yang lambat'], weak: ['Musuh terbang', 'Orc yang berlari kencang'], tip: 'Taruh di sisi dalam tikungan: genangan terkena dari dua arah.',
    extra: [{ label: 'Genangan', vals: ['5 detik', '6 detik', '7 detik'] }],
  },
  banner: {
    role: 'Penguat tim', bars: [{ label: 'Buff', v: 3 }, { label: 'Jangkauan', v: 1 }],
    skills: [{ icon: '🚩', title: 'Semangat Perang', text: 'Semua tower di 8 petak sekitarnya +25% damage (Lv2 +50%, Lv3 +75%, maksimal +100%).' }, { icon: '🐷', title: 'Menguatkan Celengan', text: 'Gaji dan bunga Celengan di sebelahnya ikut naik.' }, { icon: '🕊️', title: 'Tidak Menyerang', text: 'Hanya memberi buff, jadi taruh di tengah kelompok tower.' }],
    good: ['Tower di sekitarnya'], weak: ['Sendirian (tidak berguna)'], tip: 'Kelilingi dengan 4 sampai 8 tower untuk hasil terbaik.',
    rows: [{ label: 'Buff damage', vals: ['+25%', '+50%', '+75%'] }],
  },
  flame: {
    role: 'Semburan jarak dekat', bars: [{ label: 'Kekuatan', v: 4 }, { label: 'Jangkauan', v: 1 }, { label: 'Kecepatan', v: 5 }],
    skills: [{ icon: '🔥', title: 'Semburan Kerucut', text: 'Membakar SEMUA orc darat di depannya dalam sudut lebar (±36°), belasan kali per detik.' }, { icon: '🛡️', title: 'Lemah Terhadap Armor', text: 'Damage tiap kobaran kecil, jadi armor tebal hampir menahannya.' }],
    good: ['Pasukan berbaris', 'Orc Popok', 'Goblin'], weak: ['Armor tebal', 'Musuh terbang'], tip: 'Taruh di tepi jalan lurus supaya apinya menyapu barisan.',
  },
  trap: {
    role: 'Penjepit', bars: [{ label: 'Kekuatan', v: 3 }, { label: 'Jangkauan', v: 1 }, { label: 'Kecepatan', v: 2 }],
    skills: [{ icon: '🪤', title: 'Jepit!', text: 'Rahang menutup: 45 damage yang menembus armor.' }, { icon: '😵', title: 'Terpaku', text: 'Orc terpaku 1,5 detik (Lv2 1,8, Lv3 2,1). Bos kebal. Menggagalkan tebasan Ksatria Kelam.' }],
    good: ['Tank', 'Ksatria Kelam', 'Orc cepat'], weak: ['Musuh terbang', 'Bos'], tip: 'Kombinasikan dengan tower jarak jauh: orc yang terpaku jadi sasaran empuk.',
    rateLabel: 'Jepitan / detik', extra: [{ label: 'Terpaku', vals: ['1.5 dtk', '1.8 dtk', '2.1 dtk'] }],
  },
  repair: {
    role: 'Tukang perbaikan', bars: [{ label: 'Perbaikan', v: 3 }, { label: 'Jangkauan', v: 3 }, { label: 'Kecepatan', v: 2 }],
    skills: [{ icon: '🔨', title: 'Perbaiki Tower', text: 'Memulihkan 2 HP tower terluka terdekat tiap 1 detik. Lebih cepat saat di-upgrade.' }, { icon: '🏹', title: 'Penawar Penembak', text: 'Penangkal Sniper, Pemanah, dan Meriam musuh.' }],
    good: ['Serangan jarak jauh musuh'], weak: ['Tebasan Ksatria Kelam (langsung hancur)'], tip: 'Taruh di tengah tower yang sering diserang.',
    rows: [{ label: 'Pulih tiap', vals: ['1.0 dtk', '0.6 dtk', '0.4 dtk'] }, range('repair')],
  },
  shield: {
    role: 'Pelindung', bars: [{ label: 'Perlindungan', v: 4 }, { label: 'Jangkauan', v: 2 }],
    skills: [{ icon: '🛡️', title: 'Kubah Pelindung', text: 'Menangkis peluru, panah, dan bola meriam musuh yang mengarah ke tower di dalam kubah.' }, { icon: '🐉', title: 'Redam Api Naga', text: 'Semburan naga hanya 25% efektif pada tower yang terlindungi.' }, { icon: '⚔️', title: 'Tidak Menahan Tebasan', text: 'Tebasan Ksatria Kelam menembus kubah.' }],
    good: ['Orc Sniper', 'Pemanah', 'Orc Meriam', 'Naga'], weak: ['Ksatria Kelam'], tip: 'Satu perisai bisa melindungi banyak tower sekaligus.',
    rows: [{ label: 'Radius kubah', vals: L3(l => f1(towerStatsOf('shield', l).range)) }],
  },
  plasma: {
    role: 'Petir plasma', bars: [{ label: 'Kekuatan', v: 4 }, { label: 'Jangkauan', v: 3 }, { label: 'Kecepatan', v: 5 }],
    skills: [{ icon: '🌩️', title: 'Sambaran Tanpa Henti', text: 'Menyetrum satu orc terus-menerus dan menembus armor. Orc tersetrum melambat 25%.' }, { icon: '🔋', title: 'Overcharge', text: 'Makin lama mengunci satu target, damage naik hingga +80% (setelah 3 detik).' }, { icon: '🦅', title: 'Darat & Udara', text: 'Bisa menyambar musuh terbang.' }],
    good: ['Tank', 'Bos', 'Naga', 'Ksatria Kelam'], weak: ['Gerombolan banyak (hanya satu target)'], tip: 'Taruh dekat jalan lurus supaya targetnya tidak sering berganti.',
    rows: [{ label: 'Damage / detik', vals: L3(l => { const s = towerStatsOf('plasma', l); return String(Math.round(s.dmg / s.rate)); }) }, range('plasma')],
  },
  piggy: {
    role: 'Ekonomi', bars: [{ label: 'Pendapatan', v: 4 }, { label: 'Jangkauan', v: 3 }, { label: 'Kecepatan', v: 3 }],
    skills: [
      { icon: '💰', title: 'Gaji Rutin', text: 'Menghasilkan emas otomatis tiap beberapa detik. Naik dengan level dan buff Panji.' },
      { icon: '🏦', title: 'Bunga Akhir Wave', text: 'Tiap wave selesai, Celengan membayar bunga dari emas yang kamu simpan: 6% (maks 25), Lv2 9% (maks 45), Lv3 12% (maks 65). Menabung itu untung!' },
      { icon: '🪙', title: 'Koin Jatuh', text: 'Tiap orc yang tewas dalam jangkauan koinnya menjatuhkan emas tambahan (+1 / +2 / +3).' },
    ],
    good: ['Strategi jangka panjang', 'Dekat jalan yang ramai'], weak: ['Tidak menyerang sama sekali'], tip: 'Pasang di wave pertama dan taruh di tepi jalan: gaji, bunga, dan koin jatuh jalan bersamaan.',
    rows: [
      { label: 'Gaji', vals: L3(l => { const s = towerStatsOf('piggy', l); return `+${s.dmg} / ${f1(s.rate)} dtk`; }) },
      { label: 'Bunga wave', vals: L3(l => `${Math.round(PIGGY.pct(l) * 100)}% (maks ${PIGGY.cap(l)})`) },
      { label: 'Koin jatuh', vals: L3(l => `+${PIGGY.bounty(l)} / orc`) },
      { label: 'Jangkauan koin', vals: L3(l => f1(towerStatsOf('piggy', l).range)) },
    ],
  },
  wind: {
    role: 'Pengendali jalur', bars: [{ label: 'Kontrol', v: 4 }, { label: 'Jangkauan', v: 2 }],
    skills: [{ icon: '🌀', title: 'Hembusan Angin', text: 'Mendorong semua musuh dalam jangkauan mundur 0,9 petak per detik (+0,5 tiap level).' }, { icon: '🐘', title: 'Musuh Berat Bertahan', text: 'Bos hanya terdorong 35%, Gelondongan 50%, Tank 70%.' }, { icon: '🦅', title: 'Darat & Udara', text: 'Naga dan balon pun ikut terdorong.' }],
    good: ['Orc biasa', 'Pasukan cepat'], weak: ['Bos', 'Gelondongan', 'Tank'], tip: 'Taruh dekat finish: musuh yang hampir lolos terdorong kembali.',
    rows: [{ label: 'Dorongan', vals: L3(l => `${f1(0.9 + 0.5 * (l - 1))} / dtk`) }, range('wind')],
  },
  boomer: {
    role: 'Tembus dua kali', bars: [{ label: 'Kekuatan', v: 3 }, { label: 'Jangkauan', v: 3 }, { label: 'Kecepatan', v: 3 }],
    skills: [{ icon: '🪃', title: 'Pergi-Pulang', text: 'Bumerang melukai tiap orc yang dilewati dua kali: saat pergi dan saat kembali.' }, { icon: '🦅', title: 'Darat & Udara', text: 'Bisa mengenai musuh terbang.' }],
    good: ['Barisan panjang', 'Orc berjejer'], weak: ['Satu target saja'], tip: 'Taruh di sisi jalan lurus agar bumerang menyapu banyak orc.',
    rateLabel: 'Lemparan / detik',
  },
  mine: {
    role: 'Jebakan ranjau', bars: [{ label: 'Kekuatan', v: 4 }, { label: 'Jangkauan', v: 3 }, { label: 'Kecepatan', v: 2 }],
    skills: [{ icon: '💣', title: 'Pasang Ranjau', text: 'Menanam ranjau di jalan dalam jangkauannya (maksimal 3 aktif, +1 tiap level).' }, { icon: '💥', title: 'Ledakan Area', text: 'Ledakan radius ±1,3 petak, orc terpaku 0,7 detik (bos kebal).' }, { icon: '🚫', title: 'Hanya Darat', text: 'Musuh terbang tidak menginjak ranjau.' }],
    good: ['Gerombolan', 'Orc yang melambat'], weak: ['Musuh terbang', 'Armor tebal'], tip: 'Pasang dekat jalan lurus yang panjang.',
    rows: [{ label: 'Damage ledakan', vals: L3(l => String(towerStatsOf('mine', l).dmg)) }, { label: 'Pasang tiap', vals: L3(l => `${f1(towerStatsOf('mine', l).rate)} dtk`) }, { label: 'Ranjau aktif', vals: ['3', '4', '5'] }, range('mine')],
  },
  cactus: {
    role: 'Pemburu terbang', bars: [{ label: 'Kekuatan', v: 2 }, { label: 'Jangkauan', v: 3 }, { label: 'Kecepatan', v: 5 }],
    skills: [{ icon: '🌵', title: 'Jarum Cepat', text: 'Menembakkan jarum putih dengan sangat cepat.' }, { icon: '🦅', title: 'Damage ×3 ke Musuh Terbang', text: 'Jarum melukai naga dan balon tiga kali lipat.' }],
    good: ['Naga', 'Balon', 'Orc biasa'], weak: ['Armor tebal'], tip: 'Pasang di dekat jalur balon dan naga.',
  },
  hive: {
    role: 'Kawanan pengejar', bars: [{ label: 'Kekuatan', v: 3 }, { label: 'Jangkauan', v: 4 }, { label: 'Kecepatan', v: 3 }],
    skills: [{ icon: '🐝', title: 'Kawanan Lebah', text: 'Melepas 3 lebah (Lv2: 4, Lv3: 5) yang mengejar musuh.' }, { icon: '🎯', title: 'Sebar Target', text: 'Lebah dibagi ke 3 musuh terdepan, dan mencari target baru jika musuhnya tewas.' }, { icon: '🦅', title: 'Darat & Udara', text: 'Lebah bisa mengejar musuh terbang.' }],
    good: ['Musuh yang kabur cepat', 'Beberapa musuh sekaligus'], weak: ['Armor tebal'], tip: 'Cocok untuk orc cepat yang sulit dibidik.',
    rateLabel: 'Kawanan / detik', extra: [{ label: 'Jumlah lebah', vals: ['3', '4', '5'] }],
  },
  golem: {
    role: 'Penghantam area', bars: [{ label: 'Kekuatan', v: 4 }, { label: 'Jangkauan', v: 1 }, { label: 'Kecepatan', v: 2 }],
    skills: [{ icon: '🪨', title: 'Hentakan Gempa', text: 'Gelombang kejut melukai semua orc darat di sekitarnya (damage turun hingga 40% di tepi).' }, { icon: '😵', title: 'Terpaku', text: 'Semua korban terpaku 0,9 detik (Lv2 1,1, Lv3 1,3). Bos kebal.' }],
    good: ['Kerumunan di jalan', 'Orc cepat'], weak: ['Musuh terbang', 'Jangkauan pendek'], tip: 'Taruh tepat di sisi jalan, supaya orc harus lewat dekatnya.',
    rateLabel: 'Hentakan / detik', extra: [{ label: 'Terpaku', vals: ['0.9 dtk', '1.1 dtk', '1.3 dtk'] }],
  },
  clock: {
    role: 'Aura pelambat', bars: [{ label: 'Kontrol', v: 3 }, { label: 'Jangkauan', v: 3 }],
    skills: [{ icon: '⏳', title: 'Aura Waktu', text: 'Semua musuh di dalam jangkauan melambat 34% (Lv2 44%, Lv3 54%), darat dan udara.' }, { icon: '➕', title: 'Menumpuk dengan Es', text: 'Perlambatan Jam dan Sinar Es saling mengalikan.' }, { icon: '🕊️', title: 'Tidak Menyerang', text: 'Hanya memperlambat musuh.' }],
    good: ['Semua jenis musuh', 'Gerombolan'], weak: ['Tidak membunuh sendiri'], tip: 'Taruh di tengah tower penyerang: musuh lambat berarti lebih lama tertembak.',
    rows: [{ label: 'Perlambatan', vals: ['34%', '44%', '54%'] }, range('clock')],
  },
  prism: {
    role: 'Sinar tembus lurus', bars: [{ label: 'Kekuatan', v: 4 }, { label: 'Jangkauan', v: 5 }, { label: 'Kecepatan', v: 2 }],
    skills: [{ icon: '🌈', title: 'Sinar Pelangi', text: 'Satu sinar lebar menembus SEMUA musuh dalam satu garis lurus.' }, { icon: '📈', title: 'Makin Banyak Makin Sakit', text: '+20% damage untuk tiap musuh yang sudah tertembus (maksimal +100%).' }, { icon: '🦅', title: 'Darat & Udara', text: 'Mengenai musuh terbang juga.' }],
    good: ['Barisan lurus', 'Gerombolan di jalan lurus'], weak: ['Musuh yang menyebar'], tip: 'Taruh di ujung jalan lurus supaya orc berbaris searah sinar.',
  },
  cupid: {
    role: 'Penanda', bars: [{ label: 'Damage', v: 1 }, { label: 'Jangkauan', v: 4 }, { label: 'Dukungan', v: 5 }],
    skills: [{ icon: '💘', title: 'Tanda Hati', text: 'Musuh yang tertandai menerima +40% damage dari SEMUA tower.' }, { icon: '🪙', title: 'Bonus Emas', text: 'Musuh bertanda yang tewas memberi +50% emas.' }, { icon: '💞', title: 'Tanda Melompat', text: 'Saat musuh bertanda tewas, tandanya pindah ke musuh terdekat.' }],
    good: ['Bos', 'Musuh berarmor', 'Gerombolan'], weak: ['Damage sendiri kecil'], tip: 'Tandai musuh kuat dulu: semua tower lain jadi lebih mematikan.',
    extra: [{ label: 'Lama tanda', vals: ['5.5 dtk', '6.5 dtk', '7.5 dtk'] }],
  },
  hook: {
    role: 'Penarik', bars: [{ label: 'Kekuatan', v: 2 }, { label: 'Jangkauan', v: 4 }, { label: 'Kecepatan', v: 2 }],
    skills: [{ icon: '🎣', title: 'Tarik Mundur', text: 'Menyambar orc TERDEPAN (juga yang terbang) lalu menyeretnya mundur 2,6 petak (+0,9 tiap level).' }, { icon: '🔨', title: 'Banting', text: 'Damage ×1,5 saat orc mendarat setelah ditarik jauh.' }, { icon: '🏋️', title: 'Musuh Berat', text: 'Bos tertarik 30%, Naga 60%, Gelondongan 50%, Tank 70%.' }],
    good: ['Orc yang hampir mencapai kristal'], weak: ['Bos', 'Gelondongan'], tip: 'Taruh dekat finish sebagai pengaman terakhir.',
    rateLabel: 'Lemparan / detik', extra: [{ label: 'Tarik mundur', vals: L3(l => `${f1(2.6 + 0.9 * (l - 1))} petak`) }],
  },
  barracks: {
    role: 'Prajurit penjaga jalan', bars: [{ label: 'Kekuatan', v: 3 }, { label: 'Jangkauan', v: 2 }, { label: 'Kecepatan', v: 3 }],
    skills: [
      { icon: '🛡️', title: 'Prajurit Bertombak', text: 'Mengirim 2 prajurit lucu di Lv1 (Lv2: 3, Lv3: 5) yang berjaga di jalan dekat tower dan mengejar orc darat yang lewat.' },
      { icon: '🔱', title: 'Sodok Mental!', text: 'Tiap sodokan melukai dan MELEMPAR orc mundur di jalan. Satu sodokan tak pernah lebih dari separuh HP orc, jadi orc biasa butuh minimal 2-3 sodokan baru mati. Bos, Ksatria Kelam, dan Gelondongan sulit terdorong. Di Lv1 tombak hanya mengenai satu orc. Mulai Lv2, tombaknya menembus: orc di dekat korban ikut kena 50% damage (Lv3: 70%).' },
      { icon: '🧱', title: 'Menahan Jalan', text: 'Orc yang menempel pada prajurit melambat. Prajurit Lv1 sederhana: 6 nyawa, tidak menyembuhkan diri, bangkit setelah 5 detik. Upgrade membuat mereka lebih tangguh (Lv3: 10 nyawa, pulih sendiri, bangkit 3,6 detik).' },
    ],
    good: ['Orc biasa', 'Goblin', 'Orc Popok', 'Pasukan kecil'], weak: ['Musuh terbang', 'Bos', 'Kerumunan besar (prajurit kewalahan)'], tip: 'Taruh di sisi jalan lurus supaya prajurit punya ruang mengejar. Sebelah Panji, sodokannya makin sakit.',
    rows: [
      { label: 'Prajurit', vals: L3(l => String(BARRACKS.n[l - 1])) },
      { label: 'Nyawa prajurit', vals: L3(l => String(BARRACKS.hp[l - 1])) },
      { label: 'Pulih sendiri', vals: L3(l => (BARRACKS.regen[l - 1] ? `tiap ${BARRACKS.regen[l - 1]} dtk` : 'tidak')) },
      { label: 'Bangkit lagi', vals: L3(l => `${BARRACKS.respawn[l - 1]} dtk`) },
      { label: 'Tombak menembus', vals: L3(l => (BARRACKS.splash[l - 1] ? `${Math.round(BARRACKS.splash[l - 1] * 100)}% ke sekitar` : 'tidak')) },
      { label: 'Damage / sodok', vals: L3(l => String(towerStatsOf('barracks', l).dmg)) },
      { label: 'Sodok / detik', vals: L3(l => f1(1 / towerStatsOf('barracks', l).rate)) },
      { label: 'Lempar mundur', vals: ['±1.2 petak', '±1.2 petak', '±1.2 petak'] },
      { label: 'Area jaga', vals: L3(l => f1(towerStatsOf('barracks', l).range)) },
    ],
  },
  mind: {
    role: 'Laser kendali pikiran', bars: [{ label: 'Kontrol', v: 5 }, { label: 'Jangkauan', v: 3 }, { label: 'Kecepatan', v: 1 }],
    skills: [
      { icon: '🔮', title: 'Laser Hipnotis', text: 'Menembak SATU laser, lalu istirahat 4 detik. Orc yang terkena berhalusinasi: ia berbalik dan MENYERANG TEMANNYA sendiri selama 4 detik di Lv1 (Lv2: 6, Lv3: 8). Lv1 hanya mengenai 1 orc; Lv2 sinarnya menembus 2 orc, Lv3 menembus 3 orc yang sebaris.' },
      { icon: '👥', title: 'Pilih Kerumunan', text: 'Otomatis memilih orc yang berdiri di tengah kerumunan, supaya temannya yang kena sebanyak mungkin.' },
      { icon: '💪', title: 'Orc Besar Memukul Keras', text: 'Pukulan korban mengikuti kekuatan si orc: Tank dan Panglima sangat sakit, Goblin lemah. Bos, Naga, Ksatria Kelam, dan Panglima hanya terpengaruh sebagian waktu (Lv1 50%, Lv3 70%). Mulai Lv2, orc di dekat sasaran ikut terkena pukulan (40%, Lv3 60%).' },
      { icon: '🪙', title: 'Emas Tetap Masuk', text: 'Orc yang tewas karena temannya sendiri tetap memberi emas padamu. Mulai Lv2, tiap teman yang tumbang juga memperpanjang halusinasi (+1 detik, Lv3 +1,5 detik).' },
    ],
    good: ['Kerumunan padat', 'Orc kuat di tengah pasukan', 'Gelombang besar'], weak: ['Orc yang berjalan sendirian', 'Bos (hanya sebagian waktu)', 'Lv1 (satu orc saja)'], tip: 'Taruh di tengah jalur yang ramai. Pasangkan dengan Es atau Jam supaya orc yang berhalusinasi sempat memukul.',
    rows: [
      { label: 'Orc terkena laser', vals: ['1', '2', '3'] },
      { label: 'Lama halusinasi', vals: L3(l => `${MINDC.dur[l - 1]} dtk`) },
      { label: 'Kekuatan pukulan', vals: L3(l => `×${MINDC.pow[l - 1].toFixed(1)}`) },
      { label: 'Jeda pukulan', vals: L3(l => `${MINDC.hit[l - 1]} dtk`) },
      { label: 'Pukulan kena sekitar', vals: L3(l => (MINDC.swing[l - 1] ? `${Math.round(MINDC.swing[l - 1] * 100)}%` : 'tidak')) },
      { label: 'Perpanjang / korban tumbang', vals: L3(l => (MINDC.ext[l - 1] ? `+${MINDC.ext[l - 1]} dtk` : 'tidak')) },
      { label: 'Isi ulang laser', vals: ['4 dtk', '4 dtk', '4 dtk'] },
      range('mind'),
    ],
  },
  bowl: {
    role: 'Penyapu jalan', bars: [{ label: 'Kekuatan', v: 4 }, { label: 'Jangkauan', v: 4 }, { label: 'Kecepatan', v: 2 }],
    skills: [{ icon: '🎳', title: 'Bola Menggelinding', text: 'Bola dilempar tepat di depan orc terdepan lalu menggelinding mundur melindas semua orc darat.' }, { icon: '🎯', title: 'STRIKE!', text: 'Mengenai 3 orc atau lebih memberi bonus +12 emas.' }, { icon: '😵', title: 'Terpaku', text: 'Tiap orc yang terlindas terpaku 0,5 detik.' }],
    good: ['Barisan padat', 'Gerombolan'], weak: ['Musuh terbang'], tip: 'Taruh dekat jalan lurus yang panjang.',
    rateLabel: 'Lemparan / detik', extra: [{ label: 'Gelinding', vals: L3(l => `${f1(4.2 + 1.2 * (l - 1))} petak`) }],
  },
};

/** the rows of the Lv1 / Lv2 / Lv3 table: damage, range, rate (or custom rows) + the upgrade costs */
export function levelRows(type: TowerType): Row[] {
  const info = CARD_INFO[type]; const rows: Row[] = [];
  if (info.rows) rows.push(...info.rows);
  else if (TOWER_DEFS[type].dmg > 0) {
    rows.push({ label: 'Damage', vals: L3(l => String(towerStatsOf(type, l).dmg)) });
    rows.push(range(type));
    rows.push({ label: info.rateLabel ?? 'Tembakan / detik', vals: L3(l => f1(1 / towerStatsOf(type, l).rate)) });
  }
  if (info.extra) rows.push(...info.extra);
  rows.push({ label: 'Harga', vals: [`🪙 ${TOWER_DEFS[type].cost}`, `🪙 ${upgradeCostOf(type, 1) ?? '-'}`, `🪙 ${upgradeCostOf(type, 2) ?? '-'}`] });
  return rows;
}
