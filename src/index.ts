import type {
    ManualChunkMeta,
    OutputOptions,
  } from 'rollup'
import type { Plugin, UserConfig } from "vite";
import manualChunks from './chunk.strategy.js';

function arraify<T>(target: T | T[]): T[] {
    return Array.isArray(target) ? target : [target]
}

export interface DynamicChunkPluginOptions {
    dependencySplitOption?: {
        [key: string]: (string | RegExp)[];
    };
    splitDynamicImportDependency?: boolean;
    experimentalMinChunkSize?: number;
}

export function dynamicChunkPlugin(options: DynamicChunkPluginOptions): Plugin {
    const caches: Map<any, any>[] = []
    async function createSplitVendorChunk(output: OutputOptions, config: any, root: string) {
      const cache = new Map()
      caches.push(cache)
      const build = config.build ?? {}
      const format = output?.format
      if (!build.ssr && !build.lib && format !== 'umd' && format !== 'iife') {
        return await manualChunks(options.dependencySplitOption ?? {}, options.splitDynamicImportDependency ?? true, cache, root)
      }
    }
    return {
      name: 'vite:dynamic-chunk',
      async config(config) {
        let outputs = config?.build?.rollupOptions?.output;
        const root = config.root ?? process.cwd();
        if (outputs) {
          outputs = arraify(outputs)
          for (const output of outputs) {
            const viteManualChunks = await createSplitVendorChunk(output, config, root)
            if (viteManualChunks) {
              if (output.manualChunks) {
                if (typeof output.manualChunks === 'function') {
                  const userManualChunks = output.manualChunks
                  output.manualChunks = (id: string, api: ManualChunkMeta) => {
                    return userManualChunks(id, api) ?? viteManualChunks(id, api)
                  }
                } else {
                  console.warn(
                    "(!) the `dynamicChunkPlugin` plugin doesn't have any effect when using the object form of `build.rollupOptions.output.manualChunks`. Consider using the function form instead.",
                  )
                }
              } else {
                output.manualChunks = viteManualChunks
              }
              if (output.experimentalMinChunkSize === undefined) {
                output.experimentalMinChunkSize = options.experimentalMinChunkSize ?? 1000
              }
            }
          }
        } else {
          return {
            build: {
              rollupOptions: {
                output: {
                  manualChunks: await createSplitVendorChunk({}, config, root),
                  experimentalMinChunkSize: options.experimentalMinChunkSize ?? 1000
                },
              },
            },
          }
        }
      },
      buildStart() {
        caches.forEach((cache) => cache.clear())
      },
    }
  }
  