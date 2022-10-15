import {
	readdirSync as readdir,
	readFileSync as readFile,
	lstatSync as lstat,
	writeFileSync as writeFile,
	mkdirSync as mkdir,
	rmSync as rm,
	copyFileSync as copyFile,
} from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detailedDiff } from 'deep-object-diff';

interface IInfo {
	version: string;
	variantToIconToContent: Record<string, Record<string, string>>;
}

const thisPath = fileURLToPath(import.meta.url);
const thisDir = dirname(thisPath);

const pkg = JSON.parse(
	readFile(join(thisDir, '../package.json'), 'utf8'),
) as typeof import('../package.json');
const pkgd = JSON.parse(
	readFile(join(thisDir, '../packaged.json'), 'utf8'),
) as typeof import('../packaged.json');
const pkgName = pkgd.name;
const pkgDir = join(thisDir, '..');
const iconVersion = pkg.devDependencies['@material-design-icons/svg'];
const iconSvgDir = join(thisDir, '../node_modules/@material-design-icons/svg');
const distDir = join(thisDir, '../maic');
const infoPath = join(thisDir, './info.json!');
const distEsmDir = join(distDir, './esm');
const distCjsDir = join(distDir, './cjs');
const distDtsPath = join(distDir, './index.d.ts');
const distPkgPath = join(distDir, './package.json');

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

if (prevInfo.version === iconVersion) process.exit(69);

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
const pathToPkgPath = (path: string) =>
	`./${path.replace(new RegExp(`\\${sep}`, 'g'), '/')}`;

const { added, updated, deleted } = detailedDiff(
	prevVariantToIconToContent,
	currVariantToIconToContent,
) as {
	[k in 'added' | 'updated' | 'deleted']: Record<
		keyof typeof currVariantToIconToContent,
		typeof currVariantToIconToContent[string]
	>;
};

for (const [variant, iconToContent] of Object.entries(deleted)) {
	if (iconToContent)
		for (const icon of Object.keys(iconToContent)) {
			rm(
				join(
					distEsmDir,
					variantToExportName(variant),
					`${iconToExportName(icon)}.js`,
				),
			);
			rm(
				join(
					distCjsDir,
					variantToExportName(variant),
					`${iconToExportName(icon)}.js`,
				),
			);
		}
	else {
		rm(join(distEsmDir, variantToExportName(variant)), {
			recursive: true,
			force: true,
		});
		rm(join(distCjsDir, variantToExportName(variant)), {
			recursive: true,
			force: true,
		});
	}
}

for (const variant of Object.keys(added)) {
	mkdir(join(distEsmDir, variantToExportName(variant)), { recursive: true });
	mkdir(join(distCjsDir, variantToExportName(variant)), { recursive: true });
}

for (const [variant, iconToContent] of Object.entries({
	...added,
	...updated,
}))
	for (const [icon, content] of Object.entries(iconToContent)) {
		writeFile(
			join(
				distEsmDir,
				variantToExportName(variant),
				`${iconToExportName(icon)}.js`,
			),
			`export default \`${content}\`;\n`,
		);
		writeFile(
			join(
				distCjsDir,
				variantToExportName(variant),
				`${iconToExportName(icon)}.js`,
			),
			`module.exports = \`${content}\`;\n`,
		);
	}

const variants = Object.keys(currVariantToIconToContent);

writeFile(
	join(distEsmDir, 'index.js'),
	variants
		.map(
			(variant) =>
				`export * as ${variantToExportName(
					variant,
				)} from './${variantToExportName(variant)}/index.js';\n`,
		)
		.join(''),
);
writeFile(
	join(distCjsDir, 'index.js'),
	variants
		.map(
			(variant) =>
				`module.exports.${variantToExportName(
					variant,
				)} = require('./${variantToExportName(variant)}/index.js');\n`,
		)
		.join(''),
);

for (const [variant, iconToContent] of Object.entries(
	currVariantToIconToContent,
)) {
	const icons = Object.keys(iconToContent);

	writeFile(
		join(distEsmDir, variantToExportName(variant), 'index.js'),
		icons
			.map(
				(icon) =>
					`export { default as ${iconToExportName(
						icon,
					)} } from './${iconToExportName(icon)}.js';\n`,
			)
			.join(''),
	);
	writeFile(
		join(distCjsDir, variantToExportName(variant), 'index.js'),
		icons
			.map(
				(icon) =>
					`module.exports.${iconToExportName(
						icon,
					)} = require('./${iconToExportName(icon)}.js');\n`,
			)
			.join(''),
	);
}

writeFile(
	distDtsPath,
	`// ${pkgName}\n\ndeclare module '${pkgName}' {\n\tnamespace Maic {\n${Object.keys(
		Object.values(currVariantToIconToContent)[0] ?? {},
	)
		.map((icon) => `\t\texport const ${iconToExportName(icon)}: string;\n`)
		.join('')}\t}\n\n${Object.keys(currVariantToIconToContent)
		.map(
			(variant) =>
				`\texport const ${variantToExportName(
					variant,
				)}: typeof Maic;\n`,
		)
		.join('')}}\n\n// ${pkgName}/{variant}\n\n${Object.keys(
		currVariantToIconToContent,
	)
		.map(
			(variant) =>
				`declare module '${pkgName}/${variantToExportName(
					variant,
				)}' { const _: typeof import('maic').${variantToExportName(
					variant,
				)}; export = _; }\n`,
		)
		.join('')}\n\n// ${pkgName}/{variant}/{icon}\n\n${Object.keys(
		currVariantToIconToContent,
	)
		.map(
			(variant) =>
				`declare module '${pkgName}/${variantToExportName(
					variant,
				)}/${iconToExportName(
					'*',
				)}' { const _: string; export default _; }\n`,
		)
		.join('')}`,
);

writeFile(
	distPkgPath,
	JSON.stringify(
		{
			...pkgd,
			types: pathToPkgPath(relative(distDir, distDtsPath)),
			version: iconVersion.replace(/^\D+/, ''),

			/* eslint-disable @typescript-eslint/naming-convention */
			exports: {
				'.': {
					import: pathToPkgPath(
						relative(distDir, join(distEsmDir, 'index.js')),
					),
					require: pathToPkgPath(
						relative(distDir, join(distCjsDir, 'index.js')),
					),
				},
				'./*': {
					import: pathToPkgPath(relative(distDir, `${distEsmDir}/*`)),
					require: pathToPkgPath(
						relative(distDir, `${distCjsDir}/*`),
					),
				},
				...Object.fromEntries(
					Object.keys(currVariantToIconToContent).map(
						(variant) =>
							[
								`./${variantToExportName(variant)}/*`,
								{
									import: pathToPkgPath(
										`${relative(
											distDir,
											join(
												distEsmDir,
												variantToExportName(variant),
											),
										)}/*`,
									),
									require: pathToPkgPath(
										`${relative(
											distDir,
											join(
												distCjsDir,
												variantToExportName(variant),
											),
										)}/*`,
									),
								},
							] as const,
					),
				),
			},
			/* eslint-enable */
		},
		undefined,
		'\t',
	),
);

copyFile(join(pkgDir, './.npmignore'), join(distDir, './.npmignore'));
copyFile(join(pkgDir, './readme.md'), join(distDir, './readme.md'));
copyFile(join(pkgDir, './license'), join(distDir, './license'));

writeFile(infoPath, JSON.stringify(currInfo, undefined, '\t'));
