# Ezber

Telefonda çalışan kişisel ezber uygulaması: İngilizce kelime, sure/ayet ve hadis.
Aralıklı tekrar (FSRS) ile her gün yalnızca vadesi gelenler sorulur. Kurulum gerektirmez;
Chrome'da açıp "Uygulamayı yükle" ile ana ekrana eklenir, internetsiz çalışır.

## Geliştirme

```bash
npm install
npm run dev      # http://localhost:5173 (aynı Wi-Fi'deki telefondan da açılır)
npm test
npm run build
```

Kelimeler `data/words/*.tsv` dosyalarında; değiştirdikten sonra:

```bash
node scripts/build-words.mjs
```

### Windows notu

Bu makinedeki uygulama denetimi politikası yerel `.node` ikili dosyalarını engelliyor.
Bu yüzden Vite 6 kullanılıyor ve Rollup, `package.json`'daki `overrides` ile
WebAssembly sürümüne (`@rollup/wasm-node`) yönlendiriliyor.

## Yayın

`main` dalına her gönderimde GitHub Actions derleyip GitHub Pages'e yükler
(`.github/workflows/deploy.yml`). Depo ayarlarında Pages kaynağı "GitHub Actions" olmalı.

## Kaynaklar ve lisanslar

- Kur'an metni (quran-uthmani) ve Diyanet meali: [alquran.cloud](https://alquran.cloud) API
- Ayet sesleri: [everyayah.com](https://everyayah.com)
- Kelime listesi: [New General Service List 1.2](https://www.newgeneralservicelist.com) —
  Browne, C., Culligan, B. ve Phillips, J., [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
  `src/content/words.json` ve `data/words/` bu listeden türetilmiştir ve aynı lisansla paylaşılır.
- Hadisler: İmam Nevevî'nin Kırk Hadis'i; Türkçe çeviriler bu proje için yapılmıştır.
