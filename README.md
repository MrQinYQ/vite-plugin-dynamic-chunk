# vite-plugin-dynamic-chunk

A vite plugin for dynamic split chunk

Split dynamic import dependency.

Split entry dependency.

Merge chunks smaller than the threshold.

## Usage

```js
// use npm
npm i vite-plugin-dynamic-chunk -D
// use yarn
yarn add vite-plugin-dynamic-chunk -D
// use pnpm
pnpm i vite-plugin-dynamic-chunk -D
```

Then you can use it in vite.config.ts:
```ts
// vite.config.ts
import { dynamicChunkPlugin } from 'vite-plugin-dynamic-chunk';

const SPLIT_EXPERIENCE_MODULES = {
  react: ["react", "react-dom", "react-router-dom"],
  antd: ["antd"],
};

{
  plugins: [
    // ...
    dynamicChunkPlugin({
      dependencySplitOption: SPLIT_EXPERIENCE_MODULES
    })
  ]
}
```

## Options
```ts
interface DynamicChunkPluginOptions {
    dependencySplitOption?: {
        [key: string]: (string | RegExp)[];
    };
    splitDynamicImportDependency?: boolean; // Split dynamic import dependency. default: true
    experimentalMinChunkSize?: number;// Merge chunks smaller than the threshold. default: 1000
}
```

## License

MIT
