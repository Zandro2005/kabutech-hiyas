
const fs = require('fs');
const { create } = require('twrnc');
const tw = create();
const code = fs.readFileSync('src/screens/LiveFarmScreen.tsx', 'utf8');
const matches = [...code.matchAll(/tw\x60([^\x60]+)\x60/g)].map(m => m[1]);
console.log('Testing ' + matches.length + ' tw strings...');
const originalWarn = console.warn;
let warnings = [];
console.warn = (...args) => { warnings.push(args.join(' ')); };
matches.forEach(m => tw(m));
console.warn = originalWarn;
console.log('Warnings found:');
warnings.forEach(w => console.log(w));

