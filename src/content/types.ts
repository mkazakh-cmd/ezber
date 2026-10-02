export interface Word {
  /** İngilizce kelime */
  w: string;
  /** Sözcük türü: n, v, adj, adv, prep, pron, conj, det, num, int */
  pos: string;
  /** Türkçe anlam(lar) */
  tr: string;
  /** İngilizce örnek cümle */
  ex: string;
  /** Örnek cümlenin Türkçesi */
  exTr: string;
}

export interface Hadith {
  /** 1..42 (Nevevî'nin Kırk Hadis'i sırası) */
  n: number;
  /** Kısa başlık */
  title: string;
  /** Türkçe metin */
  text: string;
  /** Rivayet eden sahabi */
  narrator: string;
  /** Kaynak (Buhârî, Müslim...) */
  source: string;
}
