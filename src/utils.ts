// import {resolve, moduleResolve} from 'import-meta-resolve'

// export async function resolveEntry(
//     name: string,
//     root: string
//   ): Promise<string> {
//     try {
//         const result = moduleResolve(name, 'file://' + root + '/vite.config.ts' as any, new Set(['import']))
//         console.log(result);
//         return result.href.replace('file://', '');
//     } catch (e) {
//         console.error(e);
//         try {
//             const result = moduleResolve(name, 'file://' + root + '/vite.config.ts' as any, new Set(['node']))
//             console.log(result);
//             return result.href.replace('file://', '');
//         } catch (e) {
//             console.error(e);
//             return require.resolve(name, { paths: [root] });
//         }
//     }
// }

import resolve from 'resolve';

export async function resolveEntry(
    name: string,
    root: string
  ): Promise<string> {
    return resolve.sync(name, {
        basedir: root,
        extensions: ['.js'],
        packageFilter: (pkg) => {
            if (pkg.module) {
                pkg.main = pkg.module; // 优先使用 package.json 中的 "module" 字段
            }
            return pkg;
        },
        preserveSymlinks: false
    })
}