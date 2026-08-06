const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:\\Users\\삼성\\AppData\\Local\\Temp\\tmp-25156-L7E8UunmPBKg\\stats.json'));

const moduleSizes = {};

// Aggregate sizes by metaUid
Object.values(data.nodeParts).forEach(part => {
  if (!moduleSizes[part.metaUid]) {
    moduleSizes[part.metaUid] = 0;
  }
  moduleSizes[part.metaUid] += part.renderedLength;
});

const results = [];
for (const [metaUid, size] of Object.entries(moduleSizes)) {
  const meta = data.nodeMetas[metaUid];
  if (meta) {
    results.push({ id: meta.id, size });
  }
}

results.sort((a, b) => b.size - a.size);

console.log('--- Top 20 Largest Modules ---');
console.log(results.slice(0, 20).map(m => (m.size / 1024).toFixed(2) + ' KB: ' + m.id).join('\n'));
