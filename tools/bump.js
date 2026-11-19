// Stamp every script in index.html with ?v=<time> so browsers fetch the new files after a deploy
// instead of mixing cached old scripts with new ones. Runs from the git pre-commit hook.
const fs = require('fs'), path = require('path');
const file = path.join(__dirname, '..', 'index.html');
const v = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
const src = fs.readFileSync(file, 'utf8');
const out = src.replace(/(<script src="js\/[\w-]+\.js)(\?v=\w+)?"/g, `$1?v=${v}"`);
if (out !== src) fs.writeFileSync(file, out);
console.log('index.html scripts stamped v=' + v);
