# vite-plugin-chunk-split

A vite plugin for dynamic split chunk

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
    splitDynamicImportDependency?: boolean;
}
```

## License

MIT
