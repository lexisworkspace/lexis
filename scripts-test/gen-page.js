const fs = require('fs');
const lines = [];
process.stdin.on('data', d => lines.push(d.toString()));
process.stdin.on('end', () => {
  const s = lines.join('');
  fs.writeFileSync('src/app/connectors/page.tsx', s);
  console.log('Written', s.split('\n').length, 'lines');
});
