# `maic`

Material Design Icons by Google, in a tree-shakable, SVG string form. Based off of [`@material-design-icons/svg`](https://github.com/marella/material-design-icons/tree/main/svg), & automatically updates via GitHub Actions.

```svelte
<script>
	import { ic_done } from 'maic/two_tone';
	//       ^ '<svg xmlns="http://www.w3.org/2000/svg" ...'
</script>

<div class='component'>
	{@html ic_done}
</div>
```

## Structure

The structure of importables are as so:

```
┌/maic
└─┬/{variant}
  └──/ic_{icon}
```

**`{variant}`** & **`{icon}`** correspond to the variant (eg. `filled`, `outline`, `rounded`, `sharp`, `two_tone`) of the icon, & the icon font ligature (eg. `done`, `search`, `settings`), respectfully. See the full list of both on [Google Fonts](https://fonts.google.com/icons?icon.set=Material+Icons) or [`@material-design-icons/svg`'s demo](https://marella.me/material-design-icons/demo/svg)

> ❗**Caveat 1**
> 
> Unlike the folder structure found in [`@material-design-icons/svg`](https://github.com/marella/material-design-icons/tree/main/svg), the variants here are [`snake_cased`](https://en.wikipedia.org/wiki/Snake_case) rather than `kebab-cased` (eg. `two-tone` is cased as `two_tone`).
>
> For more info, see [ESM compatibility](#esm-compatibility).

> ❗**Caveat 2**
> 
> `{icon}`s are always prefixed with `ic_` (resulting in something like `import done from 'ic_done'`).
>
> For more info, see [ESM compatibility](#esm-compatibility).

#### Example

This structure is exposed both in the module exported paths, as well as each level's import. This enables, but is not limited to, the following patterns:

```js
import * as maic from 'maic';
import { filled } from 'maic';
import * as filled from 'maic/filled';
import { ic_done } from 'maic/filled';
import ic_done from 'maic/filled/done';
```

## Usage

Before you start using `maic`, ensure your bundler, import loader, or simply your JavaScript environment, performs NodeJS-style module resolution. This is the default for most popular bundlers, but you may have to enable it manually, [even for NodeJS itself](https://nodejs.org/api/cli.html#--experimental-specifier-resolutionmode).
If you aren't able to modify such a setting, you may have to modify your import specifiers (see below).

After that, simply use one of the import strategies below:

### Variant-level import

> This is the **recommended** way of using `maic`, as it balances terseness with tree-shakability.
>
> For more info, see [Tree-shaking](#tree-shaking).

Import the variant, & get access to each icon individually through named imports.

#### Example

```js
// ESM, for web, TypeScript, & modern Node applications
import { ic_1k_plus } from 'maic/filled';

// CJS, for legacy Node applications
const { ic_1k_plus } = require('maic/filled');

// Either will return:
/*
	'<svg xmlns="http://www.w3.org/2000/svg" ...'
*/
```

> **Hint**
>
> If you're having trouble importing & you're not using NodeJS-style imports, try appending `/index.js` to the end of the import specifier (eg. `maic/filled` → `maic/filled/index.js`).

### Icon-level import

> Use this when you're not using a bundler, or one that doesn't support [tree-shaking](#tree-shaking).
> Also use this you're using [dynamic imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) (eg. `await import('maic/filled/ic_1k_plus')`).
>
> For more info, see [Tree-shaking](#tree-shaking).

Import only a specific icon, & gain access to it through a default import.

```js
// ESM, for web, TypeScript, & modern Node applications
import ic_1k_plus from 'maic/filled/ic_1k_plus';

// CJS, for legacy Node applications
const ic_1k_plus = require('maic/filled/ic_1k_plus');

// Either will return:
/*
	'<svg xmlns="http://www.w3.org/2000/svg" ...'
*/
```

> **Hint**
>
> If you're having trouble importing & you're not using NodeJS-style imports, try appending `.js` to the end of the import specifier (eg. `maic/filled/ic_1k_plus` → `maic/filled/ic_1k_plus.js`).

### Top-level import

> **Use this with caution ⚠️** as to not "leak" the imported SVGs into un-tree-shakable contexts (such as cloning the immutable module object into a mutable, regular, JavaScript object)
>
> For more info, see [Tree-shaking](#tree-shaking).

Import the whole module, & gain access to variants, with their respective icons inside.

#### Example

```js
// ESM, for web, TypeScript, & modern Node applications
import { filled } from 'maic';

// CJS, for legacy Node applications
const filled = require('maic');

// Either will return:
/*
	{
		ic_1k_plus: '<svg xmlns="http://www.w3.org/2000/...',
		ic_1k: '<svg xmlns="http://www.w3.org/2000/svg" ...',
		...
	}
*/
```

## Tree-shaking

The assumption of a working, tree-shaking-capable bundles is the crux of why this module can even exist. `maic` utilises the fact that any code that is not imported, or is imported & not used, will be shed away in modern bundlers. This enables `maic` to lump the (surprisingly massive) collection of Material Design Icon SVGs into a few JavaScript files & call it a day.

...Somewhat.

Unfortunately, tree-shaking in the JavaScript ecosystem is often fragile. This is due to the dynamism of JavaScript's interpreted nature. You can do _really nasty things_ to access & assign properties (eg. `eval`). Due to this bundlers have a relatively limited scope of when & where tree-shaking happens. The gist of import-related rules are as follows:

* ✔️ Import maps
	* (eg. `import { ic_done } from 'maic/filled'`)
* ✔️ Immutable imported objects
	* (eg. `import * as filled from 'maic/filled'`)
* ❌ Dynamic imports
	* (eg. `const { ic_done } = await import('maic')`)
* ❔ CommonJS imports
	* (eg. `const { ic_done } = require('maic')`)

In the situations where tree-shaking doesn't kick in, you may want to consider using only [icon-level imports](#icon-level-import). However, if the problem permuates through your codebase, a build chain refactor is commonly the only way out.

## ESM compatibility

There have been a few changes that were carried out to enable ESM compatibility:

* Transforming `kebab-cased` folder names to [`snake_cased`](https://en.wikipedia.org/wiki/Snake_case)
	* (eg. `two-tone` is not a valid JavaScript identifier, as the hyphen is the subtraction operator)
* Appending the `ic_` prefix to every icon
	* (eg. `1k` is not a valid JavaScript identifier, as it starts with a number)

Both of these choices were made to allow imports to be consistent across folder structures & ESModule imports.

#### Example

```js
// `two_tone` can be imported & is consistent with directory imports
// the `ic_` prefix appears everywhere instead of only certain places

import { ic_1k } from 'maic/filled';
import ic_1k_plus from 'maic/filled/ic_1k_plus';
import { two_tone } from 'maic';
import { ic_1x_mobiledata } from 'maic/two_tone';
import ic_2k_plus from 'maic/two_tone/ic_2k_plus';
```

## License

* Material design icons are created by [Google](https://github.com/google/material-design-icons#license).
* SVG's are sourced from [`@material-design-icons`](https://github.com/marella/material-design-icons/tree/main/svg), which is licensed under the [Apache License Version 2.0](https://github.com/marella/material-design-icons/blob/main/svg/LICENSE).
* This project is distributed under the [MIT License](https://opensource.org/licenses/MIT).