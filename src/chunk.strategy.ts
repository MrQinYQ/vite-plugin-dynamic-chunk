import * as path from 'path';

const map = new Map<string, string[]>();
const cssLangs = '\\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\\?)';
const cssLangRE = new RegExp(cssLangs);
const isCSSIdentifier = (request: string) => cssLangRE.test(request);
function staticImportedScan(
    id: string,
    getModuleInfo: (arg0: any) => any,
    cache: Map<any, any>,
    importChain: string[] = [],
) {
    if (cache.has(id)) {
        return cache.get(id);
    }
    if (importChain.includes(id)) {
        // circular deps!
        cache.set(id, false);
        return false;
    }
    const mod = getModuleInfo(id);
    if (!mod) {
        cache.set(id, false);
        return false;
    }
    if (mod.isEntry) {
        cache.set(id, true);
        return true;
    }
    const staticImport = mod.importers.some((importer: any) =>
        staticImportedScan(importer, getModuleInfo, cache, importChain.concat(id)),
    );
    cache.set(id, staticImport);
    return staticImport;
}

function dynamicImportedScan(
    id: string,
    getModuleInfo: (arg0: unknown) => {
        importers: any;
        dynamicImporters: any;
        isEntry?: any;
    },
) {
    const { importers, dynamicImporters } = getModuleInfo(id);
    const dependentEntryPoints = new Set<string>(dynamicImporters);
    const idsToHandle = new Set<string>(importers);
    const lastImporters = new Set<string>();
    for (const moduleId of idsToHandle) {
        const { isEntry, dynamicImporters: _dynamicImporters, importers: _importers } = getModuleInfo(moduleId);
        if (isEntry) {
            continue;
        }
        if (_dynamicImporters.length > 0) {
            lastImporters.add(moduleId);
            _dynamicImporters.map((item: string) => dependentEntryPoints.add(item));
        }
        if (_importers.length > 0) {
            for (const importer of _importers) {
                idsToHandle.add(importer);
            }
        }
    }
    const result: string[] = [];
    for (const s of lastImporters) {
        result.push(s);
    }
    const alldynamic: string[] = [];
    for (const s of dependentEntryPoints) {
        alldynamic.push(s);
    }
    return {
        result,
        alldynamic,
    };
}

const cache = new Map();
const wrapCustomSplitConfig = (
    manualChunks: {
        (id: any, { getModuleInfo }: { getModuleInfo: any }): string | undefined;
        (arg0: any, arg1: { getModuleIds: any; getModuleInfo: any }): any;
    },
    customOptions: {
        [key: string]: (string | RegExp)[];
    },
) => {
    const groups = Object.keys(customOptions);
    const ginfo: {
        [key: string]: {
            depS: string[];
            depR: RegExp[];
            raw: (string | RegExp)[];
        };
    } = {};
    for (const group of groups) {
        const packageInfo = customOptions[group];
        const depR = packageInfo.filter((item: any) => item instanceof RegExp) as RegExp[];
        const depS = packageInfo
            .filter((item: any) => typeof item === 'string') as string[];
            // .map((item: any) => {
            //     try {
            //         return resolve.sync(item, {
            //             basedir: process.cwd(),
            //             preserveSymlinks: false,
            //         });
            //     } catch (err) {
            //         console.error('err', err);
            //         return '';
            //     }
            // })
            // .filter((_: string | any[]) => _.length > 0);
        ginfo[group] = {
            depR,
            depS,
            raw: packageInfo,
        };
    }

    return (moduleId: string, { getModuleIds, getModuleInfo }: any) => {
        const isDepInclude = (id: string, depPaths: any[], importChain: any[], _groups: string[]) => {
            const key = `${id}-${depPaths.join('|')}`;
            // circular dependency
            if (importChain.includes(id)) {
                cache.set(key, false);
                return false;
            }
            if (cache.has(key)) {
                return cache.get(key);
            }
            if (depPaths.some((item) => id.includes(`${item}/`)) || _groups.some((item) => id.indexOf(`${item}/`) > -1)) {
              importChain.forEach((item: any) => cache.set(`${item}-${depPaths.join('|')}`, true));
              return true;
            }
            const moduleInfo = getModuleInfo(id);
            if (!moduleInfo || !moduleInfo.importers) {
                cache.set(key, false);
                return false;
            }
            const isInclude = moduleInfo.importers.some((importer: any) =>
                isDepInclude(importer, depPaths, importChain.concat(id), _groups),
            );
            // set cache, important!
            cache.set(key, isInclude);
            return isInclude;
        };

        if (
            // moduleId.includes('node_modules') &&
            !isCSSIdentifier(moduleId)
        ) {
            // console.log('moduleId', moduleId);
            const gks = Object.keys(ginfo);
            for (const group of gks) {
                const { depR, depS, raw } = ginfo[group];
                if (
                    depS.length &&
                    isDepInclude(moduleId, depS, [], raw.filter((item) => typeof item === 'string') as string[])
                ) {
                    map.set(group, [...(map.get(group) ?? []), moduleId]);
                    // console.log(moduleId, group);
                    return group;
                }
                for (const rule of depR) {
                    if (rule.test(moduleId)) {
                        map.set(group, [...(map.get(group) ?? []), moduleId]);
                        // console.log(moduleId, group);
                        return group;
                    }
                }
            }
        }

        const group = manualChunks(moduleId, { getModuleIds, getModuleInfo });
        return group;
    };
};

function getLastname(importedId: string) {
    const dirs = importedId.split(path.sep);
    let name = dirs[dirs.length - 1];
    if (name.indexOf('index') > -1 && dirs.length > 1) {
        name = dirs[dirs.length - 2];
    }
    return name;
}

const manualChunks = (
    dependencySplitOption: {
        [key: string]: (string | RegExp)[];
    },
    splitDynamicImportDependency = true,
    cache: Map<any, any>
) => {
    return wrapCustomSplitConfig((id: string, { getModuleInfo }: any) => {
        if (isCSSIdentifier(id)) {
            return;
        }

        if (id.includes('node_modules')) {
            const result = staticImportedScan(id, getModuleInfo, cache, []);
            if (result) {
                map.set('vendor', [...(map.get('vendor') ?? []), id]);
                return 'vendor';
            }

            if (splitDynamicImportDependency) {
                const scanresult = dynamicImportedScan(id, getModuleInfo);
                if (scanresult.result.length > 0) {
                    const name = scanresult.result
                        .map((importedId: string) => {
                            const lastname = getLastname(importedId);
                            const extname = path.extname(lastname);
                            const _result = lastname.replace(extname, '');
                            return _result;
                        })
                        .sort()
                        .join('_');
                    const chunkname = `${name}_vendor`;
                    map.set(chunkname, [...(map.get(chunkname) ?? []), id]);
                    return chunkname;
                }
            }
        } else {
            // const result = staticImportedScan(id, getModuleInfo, cache, []);
            // if (result) {
            //     map.set('index', [...(map.get('index') ?? []), id]);
            //     return 'index';
            // }
            // 不需要进行如下处理, rollup自己会有类似操作, 对于动态import如果你没有返回拆分包名，rollup也会为你拆分chunk, 其多个chunk公用代码rollup也会为你拆分，所以原则上我们要做的只需要处理依赖即可
            // const scanresult = dynamicImportedScan(id, getModuleInfo);
            // if (scanresult.result.length > 0) {
            //   const name = scanresult.result
            //     .map((importedId: string) => {
            //       const lastname = getLastname(importedId);
            //       const extname = path.extname(lastname);
            //       const _result = lastname.replace(extname, "");
            //       return _result;
            //     })
            //     .sort()
            //     .join("_");
            //     const chunkname = `${name}_share`;
            //     map.set(chunkname, [...(map.get(chunkname) ?? []), id]);
            //     return chunkname;
            // }
        }

    }, dependencySplitOption);
};

export default manualChunks;
