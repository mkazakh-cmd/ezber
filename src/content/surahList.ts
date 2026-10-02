/** [sure no, Türkçe ad, ayet sayısı] — Hafs rivayeti, toplam 6236 ayet. */
const RAW: [number, string, number][] = [
  [1, 'Fâtiha', 7], [2, 'Bakara', 286], [3, 'Âl-i İmrân', 200], [4, 'Nisâ', 176],
  [5, 'Mâide', 120], [6, "En'âm", 165], [7, "A'râf", 206], [8, 'Enfâl', 75],
  [9, 'Tevbe', 129], [10, 'Yûnus', 109], [11, 'Hûd', 123], [12, 'Yûsuf', 111],
  [13, "Ra'd", 43], [14, 'İbrâhîm', 52], [15, 'Hicr', 99], [16, 'Nahl', 128],
  [17, 'İsrâ', 111], [18, 'Kehf', 110], [19, 'Meryem', 98], [20, 'Tâhâ', 135],
  [21, 'Enbiyâ', 112], [22, 'Hac', 78], [23, "Mü'minûn", 118], [24, 'Nûr', 64],
  [25, 'Furkân', 77], [26, 'Şuarâ', 227], [27, 'Neml', 93], [28, 'Kasas', 88],
  [29, 'Ankebût', 69], [30, 'Rûm', 60], [31, 'Lokmân', 34], [32, 'Secde', 30],
  [33, 'Ahzâb', 73], [34, "Sebe'", 54], [35, 'Fâtır', 45], [36, 'Yâsîn', 83],
  [37, 'Sâffât', 182], [38, 'Sâd', 88], [39, 'Zümer', 75], [40, "Mü'min", 85],
  [41, 'Fussilet', 54], [42, 'Şûrâ', 53], [43, 'Zuhruf', 89], [44, 'Duhân', 59],
  [45, 'Câsiye', 37], [46, 'Ahkâf', 35], [47, 'Muhammed', 38], [48, 'Fetih', 29],
  [49, 'Hucurât', 18], [50, 'Kâf', 45], [51, 'Zâriyât', 60], [52, 'Tûr', 49],
  [53, 'Necm', 62], [54, 'Kamer', 55], [55, 'Rahmân', 78], [56, 'Vâkıa', 96],
  [57, 'Hadîd', 29], [58, 'Mücâdele', 22], [59, 'Haşr', 24], [60, 'Mümtehine', 13],
  [61, 'Saf', 14], [62, 'Cuma', 11], [63, 'Münâfikûn', 11], [64, 'Teğâbün', 18],
  [65, 'Talâk', 12], [66, 'Tahrîm', 12], [67, 'Mülk', 30], [68, 'Kalem', 52],
  [69, 'Hâkka', 52], [70, 'Meâric', 44], [71, 'Nûh', 28], [72, 'Cin', 28],
  [73, 'Müzzemmil', 20], [74, 'Müddessir', 56], [75, 'Kıyâme', 40], [76, 'İnsân', 31],
  [77, 'Mürselât', 50], [78, "Nebe'", 40], [79, 'Nâziât', 46], [80, 'Abese', 42],
  [81, 'Tekvîr', 29], [82, 'İnfitâr', 19], [83, 'Mutaffifîn', 36], [84, 'İnşikâk', 25],
  [85, 'Bürûc', 22], [86, 'Târık', 17], [87, "A'lâ", 19], [88, 'Gâşiye', 26],
  [89, 'Fecr', 30], [90, 'Beled', 20], [91, 'Şems', 15], [92, 'Leyl', 21],
  [93, 'Duhâ', 11], [94, 'İnşirâh', 8], [95, 'Tîn', 8], [96, 'Alak', 19],
  [97, 'Kadir', 5], [98, 'Beyyine', 8], [99, 'Zilzâl', 8], [100, 'Âdiyât', 11],
  [101, 'Kâria', 11], [102, 'Tekâsür', 8], [103, 'Asr', 3], [104, 'Hümeze', 9],
  [105, 'Fîl', 5], [106, 'Kureyş', 4], [107, 'Mâûn', 7], [108, 'Kevser', 3],
  [109, 'Kâfirûn', 6], [110, 'Nasr', 3], [111, 'Tebbet', 5], [112, 'İhlâs', 4],
  [113, 'Felak', 5], [114, 'Nâs', 6],
];

export interface SurahInfo {
  number: number;
  name: string;
  ayahCount: number;
}

export const SURAHS: SurahInfo[] = RAW.map(([number, name, ayahCount]) => ({ number, name, ayahCount }));

export function surahName(n: number): string {
  return RAW[n - 1]?.[1] ?? `Sure ${n}`;
}
