import * as fs from 'fs/promises';
import * as path from 'path';

interface DependencyGraph {
    [name: string]: string[];
}

async function extractCarthageDependencies(projectPath: string): Promise<DependencyGraph> {
    const cartfileResolvedPath = path.join(projectPath, 'Cartfile.resolved');
    const graph: DependencyGraph = {};

    try {
        const cartfileResolvedContent = await fs.readFile(cartfileResolvedPath, 'utf-8');
        const lines = cartfileResolvedContent.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('github') || trimmedLine.startsWith('binary')) {
                const parts = trimmedLine.split(' ');
                if (parts.length >= 2) {
                    const dependencyName = parts[1].split('/')[1].split('"')[0];
                    console.log(dependencyName);
                    const version = parts[2].replace(/"/g, '');
                    console.log(version);

                    graph[dependencyName] = [];
                }
            }
        }

        const buildPath = path.join(projectPath, 'Carthage', 'Build');
        console.log(buildPath);

        for (const dependencyName of Object.keys(graph)) {
            const dependencyBuildPath = path.join(buildPath, dependencyName + '.xcframework');
            if (await fileExists(dependencyBuildPath)) {
                await extractTransitiveDependencies(dependencyBuildPath, graph, dependencyName);
            } else {
              const dependencyBuildPathIos = path.join(buildPath, 'iOS', dependencyName + '.framework');
              const dependencyBuildPathMac = path.join(buildPath, 'Mac', dependencyName + '.framework');
              const dependencyBuildPathTvOS = path.join(buildPath, 'tvOS', dependencyName + '.framework');
              const dependencyBuildPathWatchOS = path.join(buildPath, 'watchOS', dependencyName + '.framework');

              if (await fileExists(dependencyBuildPathIos)) {
                  await extractTransitiveDependencies(dependencyBuildPathIos, graph, dependencyName);
              }
              if (await fileExists(dependencyBuildPathMac)) {
                await extractTransitiveDependencies(dependencyBuildPathMac, graph, dependencyName);
              }
              if (await fileExists(dependencyBuildPathTvOS)) {
                  await extractTransitiveDependencies(dependencyBuildPathTvOS, graph, dependencyName);
              }
              if (await fileExists(dependencyBuildPathWatchOS)) {
                  await extractTransitiveDependencies(dependencyBuildPathWatchOS, graph, dependencyName);
              }
            }
        }

        return graph;
    } catch (error) {
        console.error('Error extracting Carthage dependencies:', error);
        return {};
    }
}

async function extractTransitiveDependencies(dependencyPath: string, graph: DependencyGraph, parentDependency: string): Promise<void> {

    const frameworkInfoPath = path.join(dependencyPath, 'Info.plist');
    console.log(frameworkInfoPath);
    console.log("ready to check frameworkInfoPath")

    if (!(await fileExists(frameworkInfoPath))) {
        console.log("inside frameworkInfoPath block")
        //xcframework case:
        const iosPath = path.join(dependencyPath, 'ios-'+dependencyPath.split('.xcframework')[0].split('/').pop()+'.framework', 'Info.plist');
        console.log(iosPath);
        const macPath = path.join(dependencyPath, 'macos-'+dependencyPath.split('.xcframework')[0].split('/').pop()+'.framework', 'Info.plist');
        console.log(macPath);
        const tvosPath = path.join(dependencyPath, 'tvos-'+dependencyPath.split('.xcframework')[0].split('/').pop()+'.framework', 'Info.plist');
        console.log(tvosPath);
        const watchosPath = path.join(dependencyPath, 'watchos-'+dependencyPath.split('.xcframework')[0].split('/').pop()+'.framework', 'Info.plist');
        console.log(watchosPath);

        if(await fileExists(iosPath)){
          await parseTransitive(iosPath, graph, parentDependency);
        }
        else if(await fileExists(macPath)){
          await parseTransitive(macPath, graph, parentDependency);
        }
        else if(await fileExists(tvosPath)){
          await parseTransitive(tvosPath, graph, parentDependency);
        }
        else if(await fileExists(watchosPath)){
          await parseTransitive(watchosPath, graph, parentDependency);
        }
        return;
    }
    await parseTransitive(frameworkInfoPath, graph, parentDependency);
}

async function parseTransitive(frameworkInfoPath:string, graph: DependencyGraph, parentDependency: string){
  try {
    const plistContent = await fs.readFile(frameworkInfoPath, 'utf-8');
    const regex = /<string>([\w\.\-]+)<\/string>/g;
    let match;
    while ((match = regex.exec(plistContent)) !== null) {
        if (match[1].endsWith('.framework')) {
            const transitiveDependencyName = match[1].replace('.framework', '');
            if (graph[transitiveDependencyName]) {
                if (!graph[parentDependency].includes(transitiveDependencyName)) {
                    graph[parentDependency].push(transitiveDependencyName);
                }
            }
        }
    }
  } catch (error) {
      console.error(`Error parsing Info.plist at ${frameworkInfoPath}:`, error);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Example usage:
async function main() {
    const projectPath = '/Users/gwunleong/GitHub/cardscan-carthage-example/CarthageBuildTest'; // Replace with your project path
    const dependencies = await extractCarthageDependencies(projectPath);
    console.log(JSON.stringify(dependencies, null, 2));
}

main();
