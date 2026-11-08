// Format only this phase's new source, and reject any AST change.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const parser = require(path.join(root, 'node_modules/next/dist/compiled/babel/parser'));
const generate = require(path.join(root, 'node_modules/next/dist/compiled/babel/generator')).default;
const files = ['frontend/app/dev/templates/page.js', 'frontend/app/dev/templates/TemplateEditor.js', 'frontend/app/dev/templates/workspace.js', 'frontend/lib/templatePreview.js', 'frontend/lib/templatePayload.js', 'frontend/app/dev/record/templateFixtures.js'];
const ignored = new Set(['start', 'end', 'loc', 'extra', 'tokens', 'comments', 'leadingComments', 'trailingComments', 'innerComments', 'errors']);
const normalize = ast => JSON.parse(JSON.stringify(ast, (key, value) => ignored.has(key) ? undefined : value));
const parse = text => parser.parse(text, { sourceType: 'module', plugins: ['jsx'] });
const proof = files.map(file => {
  const absolute = path.join(root, file), before = fs.readFileSync(absolute, 'utf8');
  const ast = parse(before), after = generate(ast, { comments: true }).code + '\n';
  assert.deepEqual(normalize(ast), normalize(parse(after)), file);
  fs.writeFileSync(absolute, after);
  return { file, ASTEquivalent: true, sha256: crypto.createHash('sha256').update(after).digest('hex') };
});
fs.writeFileSync(path.join(__dirname, 'format-proof.json'), JSON.stringify(proof, null, 2) + '\n');
console.log('PASS formatting preserves all six source ASTs');
