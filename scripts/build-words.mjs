// data/words/*.tsv → src/content/words.json
// Her satır: kelime \t tür \t Türkçe \t örnek \t örneğin Türkçesi
// NGSL sırasıyla birebir karşılaştırır; uyuşmazlıkta durur.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const order = readFileSync('data/ngsl_top1000.txt', 'utf8').trim().split(/\r?\n/).map((w) => w.toLowerCase());
const files = readdirSync('data/words').filter((f) => f.endsWith('.tsv')).sort();
const words = [];
const errors = [];
for (const f of files) {
  readFileSync(`data/words/${f}`, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const cols = line.split('\t');
    if (cols.length !== 5 || cols.some((c) => !c.trim())) errors.push(`${f}:${i + 1} sütun sayısı ${cols.length}`);
    const [w, pos, tr, ex, exTr] = cols.map((c) => c?.trim());
    words.push({ w, pos, tr, ex, exTr });
  });
}
if (words.length !== order.length) errors.push(`kelime sayısı ${words.length}, beklenen ${order.length}`);
words.forEach((x, i) => {
  if (x.w.toLowerCase() !== order[i]) errors.push(`${i + 1}. sıra: "${x.w}" ≠ NGSL "${order[i]}"`);
});
const dup = words.map((x) => x.w).filter((w, i, a) => a.indexOf(w) !== i);
if (dup.length) errors.push(`tekrar eden: ${dup.join(', ')}`);
if (errors.length) {
  console.error(errors.slice(0, 30).join('\n'));
  process.exit(1);
}
writeFileSync('src/content/words.json', JSON.stringify(words, null, 0).replace(/\},\{/g, '},\n{') + '\n');
console.log(`${words.length} kelime yazıldı`);
