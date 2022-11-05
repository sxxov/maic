export default ({ enabled = true }) => {
	if (!enabled) return null;

	/** @typedef {{ variant: string; imports: string[] }} DevMaicHelperData */
	/** @type {Map<string, DevMaicHelperData>} */
	const generatedIdToData = new Map();
	const generateId = () =>
		generatedIdToData.size.toString(36).padStart(4, '|');

	return {
		name: 'maic helper',
		transform(/** @type {string} */ src, /** @type {string} */ id) {
			/**
			 * @type {| (RegExpExecArray & {
			 * 			indices?: {
			 * 				[number]: number;
			 * 				groups: Record<string, [number, number]>;
			 * 			};
			 * 	  })
			 * 	| null}
			 */
			let curr = null;
			const regex =
				/import +{(?<content>(?:[^}{])*)} +from +["'](?<maic>maic)(?:\/(?<variant>\w+))?["'];?/dg;
			let dist = '';
			let prevIndex = 0;

			while ((curr = regex.exec(src))) {
				const {
					0: match,
					groups: { content, variant } = {},
					indices: { groups: { maic: [maicStartI, maicEndI] } } = {
						groups: {},
					},
					index,
				} = curr;
				const imports = content
					.split(',')
					.map((v) => v.trim().match(/^[\w$]+/))
					.filter(Boolean);
				const generatedId = generateId();
				const result = `${match.slice(
					0,
					maicStartI - prevIndex - index,
				)}${generatedId}${match.slice(maicEndI - prevIndex - index)}`;

				generatedIdToData.set(generatedId, {
					variant,
					imports,
				});

				dist += `${src.slice(prevIndex, index)}${result}`;
				prevIndex = index + result.length;
			}

			if (prevIndex <= 0) return null;

			dist += src.slice(prevIndex);

			return dist;
		},
		resolveId(/** @type {string} */ id) {
			return generatedIdToData.has(id.slice(0, 4))
				? `\0${id}`
				: null;
		},
		load(/** @type {string} */ id) {
			const { imports, variant } =
				/** @type {DevMaicHelperData} */ (
					generatedIdToData.get(id.slice(1, 5)) ?? {}
				);

			if (!imports) return null;

			return imports
				.map(
					(icon) =>
						`export { default as ${icon} } from '/node_modules/maic/esm/${variant}/${icon}.js';`,
				)
				.join('\n');
		},
	};
};
