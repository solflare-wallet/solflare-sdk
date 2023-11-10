const ts = require('typescript');
const fs = require('fs');
const pkg = require('../package.json');
const esmConfig = require('../tsconfig.json');
const cjsConfig = require('../tsconfig.cjs.json');

const source = `export const VERSION = "${pkg.version}";`;
const definition = `export declare const VERSION = "${pkg.version}";`;

const esmOutput = ts.transpileModule(source, esmConfig);
const cjsOutput = ts.transpileModule(source, cjsConfig);

fs.writeFileSync('lib/esm/version.js', esmOutput.outputText);
fs.writeFileSync('lib/cjs/version.js', cjsOutput.outputText);

fs.writeFileSync('lib/esm/version.d.ts', definition);
fs.writeFileSync('lib/cjs/version.d.ts', definition);


