import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { readFileSync as readFile } from 'node:fs';
import type Package from './package.json';

const thisPath = fileURLToPath(import.meta.url);
const thisDir = dirname(thisPath);

const pkg = JSON.parse(
	readFile(join(thisDir, './package.json'), 'utf8'),
) as typeof Package;
const iconVersion = pkg.devDependencies['@material-design-icons/svg'].replace(
	/^\^/,
	'',
);

console.log(`publish: setting version(${iconVersion})...`);
execSync(`npm version ${iconVersion}`);

console.log(`publish: publishing...`);
execSync(`npm publish`, { stdio: 'ignore' });

console.log(`publish: success!`);
