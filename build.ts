import {
	readdirSync as readdir,
	readFileSync as readFile,
	lstatSync as lstat,
	writeFileSync as writeFile,
	mkdirSync as mkdir,
	rmSync as rm,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { detailedDiff } from 'deep-object-diff';

interface IInfo {
	version: string;
	variantToIconToContent: Record<string, Record<string, string>>;
}

const thisPath = fileURLToPath(import.meta.url);
const thisDir = dirname(thisPath);

console.log('init: updating @material-design-icons/svg...');
{
	const prevDir = process.cwd();
	process.chdir(thisDir);
	execSync('npm i -D @material-design-icons/svg@*');
	process.chdir(prevDir);
}

console.log('init: starting...');

const pkg = JSON.parse(
	readFile(join(thisDir, './package.json'), 'utf8'),
) as typeof import('./package.json');
const iconVersion = pkg.devDependencies['@material-design-icons/svg'];
const iconSvgDir = join(thisDir, './node_modules/@material-design-icons/svg');
const distDir = join(thisDir, '.');
const infoPath = join(thisDir, './built.json!');

console.log(`init: parsing previously collected info...`);
const prevInfo: IInfo = (() => {
	try {
		return JSON.parse(readFile(infoPath, 'utf8')) as IInfo;
	} catch {
		rm(distDir, { recursive: true, force: true });
		mkdir(distDir, { recursive: true });

		return {
			version: '!not a version!',
			variantToIconToContent: {},
		};
	}
})();

if (prevInfo.version === iconVersion) {
	console.log(`build: up to date with the latest version(${iconVersion})!`);
	process.exit(69);
}

console.log(
	`build: building new version(${prevInfo.version} → ${iconVersion})...`,
);

const currInfo: IInfo = {
	version: iconVersion,
	variantToIconToContent: Object.fromEntries(
		readdir(iconSvgDir)
			.filter((filename) =>
				lstat(join(iconSvgDir, filename)).isDirectory(),
			)
			.map(
				(variantDir) =>
					[
						variantDir,
						Object.fromEntries(
							readdir(join(iconSvgDir, variantDir))
								.filter((filename) => filename.endsWith('.svg'))
								.sort()
								.map(
									(iconFilename) =>
										[
											iconFilename.replace(/\.svg$/, ''),
											readFile(
												join(
													iconSvgDir,
													variantDir,
													iconFilename,
												),
												'utf8',
											),
										] as const,
								),
						),
					] as const,
			),
	),
};

const { variantToIconToContent: currVariantToIconToContent } = currInfo;
const { variantToIconToContent: prevVariantToIconToContent } = prevInfo;

const iconToExportName = (icon: string) => `ic_${icon}`;
const variantToExportName = (variant: string) =>
	variant.replace(/[^\w$]/g, '_');

const { added, updated, deleted } = detailedDiff(
	prevVariantToIconToContent,
	currVariantToIconToContent,
) as {
	[k in 'added' | 'updated' | 'deleted']: Record<
		keyof typeof currVariantToIconToContent,
		typeof currVariantToIconToContent[string]
	>;
};

console.log(`\tnew\t: ${Object.keys(added).length}`);
console.log(`\tchanged\t: ${Object.keys(updated).length}`);
console.log(`\tstale\t: ${Object.keys(deleted).length}`);

console.log(`build: purging stale...`);
{
	for (const [variant, iconToContent] of Object.entries(deleted)) {
		if (iconToContent)
			for (const icon of Object.keys(iconToContent)) {
				console.log(`\t${variant}/${icon}`);

				rm(
					join(
						distDir,
						variantToExportName(variant),
						`${iconToExportName(icon)}.js`,
					),
					{
						recursive: true,
						force: true,
					},
				);
			}
		else {
			console.log(`\t${variant}/*`);

			rm(join(distDir, variantToExportName(variant)), {
				recursive: true,
				force: true,
			});
		}
	}
}

console.log(`build: writing icons...`);
{
	for (const variant of Object.keys(added))
		mkdir(join(distDir, variantToExportName(variant)), { recursive: true });

	for (const [variant, iconToContent] of Object.entries({
		...added,
		...updated,
	}))
		for (const [icon, content] of Object.entries(iconToContent)) {
			console.log(`\t${variant}/${icon}`);

			writeFile(
				join(
					distDir,
					variantToExportName(variant),
					`${iconToExportName(icon)}.js`,
				),
				`export default \`${content}\`;\n`,
			);
			writeFile(
				join(
					distDir,
					variantToExportName(variant),
					`${iconToExportName(icon)}.d.ts`,
				),
				`declare const _: \`${content}\`; export default _;\n`,
			);
		}
}

console.log(`build: writing directory imports...`);
{
	console.log(`\t.`);
	writeFile(
		join(distDir, 'index.js'),
		Object.keys(currVariantToIconToContent)
			.map((variant) => {
				const exportName = variantToExportName(variant);

				return `export * as ${exportName} from './${exportName}/index.js';\n`;
			})
			.join(''),
	);
	writeFile(
		join(distDir, 'index.d.ts'),
		Object.keys(currVariantToIconToContent)
			.map((variant) => {
				const exportName = variantToExportName(variant);

				return `export declare const ${exportName}: typeof import('./${exportName}/index.js');\n`;
			})
			.join(''),
	);

	for (const [variant, iconToContent] of Object.entries(
		currVariantToIconToContent,
	)) {
		console.log(`\t${variant}`);
		writeFile(
			join(distDir, variantToExportName(variant), 'index.js'),
			Object.keys(iconToContent)
				.map((icon) => {
					const exportName = iconToExportName(icon);

					return `export { default as ${exportName} } from './${exportName}.js';\n`;
				})
				.join(''),
		);
		writeFile(
			join(distDir, variantToExportName(variant), 'index.d.ts'),
			Object.entries(iconToContent)
				.map(([icon, content]) => {
					const exportName = iconToExportName(icon);

					return `export declare const ${exportName}: \`${content}\`;\n`;
				})
				.join(''),
		);
	}
}

console.log(`build: saving collected info...`);
{
	writeFile(infoPath, JSON.stringify(currInfo, undefined, '\t'));
}

console.log(`build: success!`);
