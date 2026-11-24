const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const excluded = ['.original', '.stage19', '.stage35_original'];
const files = ['engine44.js', ...fs.readdirSync(path.join(root, 'assets'), { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.js') &&
    !excluded.some(suffix => entry.name.endsWith(suffix)))
  .map(entry => path.join('assets', entry.name))
  .sort()];

let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  if (result.status === 0 && !result.error) {
    console.log(`PASS ${file}`);
  } else {
    failed++;
    console.log(`FAIL ${file}`);
    if (result.error) console.error(result.error.message);
    if (result.stderr) process.stderr.write(result.stderr);
  }
}
console.log(`Summary: ${files.length - failed} passed, ${failed} failed, ${files.length} total`);
if (failed) process.exitCode = 1;
