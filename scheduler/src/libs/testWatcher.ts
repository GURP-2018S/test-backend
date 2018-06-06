import * as chokidar from "chokidar";
import * as fs from "fs";
import * as util from "util";
import Project = Selianize.Project;
import * as path from "path";
let watcher: chokidar.FSWatcher;

interface IMapIdToTest {
  id: string;
  jsFileName: string;
  jsContent?: string;
  sideFileName: string;
  sideContent?: Project;
}

// Id to Map
export const idToTest: Record<string, IMapIdToTest> = {};
// FileName to Map
export const testJsToId: Record<string, IMapIdToTest> = {};

// .dotfiles and node_modules
const ignoredFiles = /([\/\\]\..+$)|\/node_modules\//;

const sideFiles = /\/__side__\//;
const testFiles = /\/__test__\/.*\.js/;

export function initialize() {
  watcher = chokidar.watch("../test-environment", {
    ignored: ignoredFiles,
    persistent: true
  });

  watcher.on("ready", onReady);
  // Create
  watcher.on("add", onCreateFile);
  // Update
  watcher.on("change", onUpdateFile);
  // Delete
  watcher.on("unlink", onDeleteFile);
}

async function onReady() {
  console.log("Test watcher ready");
  // console.log(idToTest);
  // console.log(testJsToId)
}

async function onCreateFile(relPath: string) {
  console.log(`Add ${relPath}`);
  await loadData(path.resolve(relPath));
}

async function onUpdateFile(relPath: string) {
  console.log(`Update ${relPath}`);

  // It won't be handled to reduce the complexity
  // const meta = await getMeta(path);
  // if (meta.id) {
  //   await loadData(path);
  // }
}

async function onDeleteFile(relPath: string) {
  console.log(`Delete ${relPath}`);
  const meta = await getMeta(path.resolve(relPath));
  if (meta.id) {
    const idMap = idToTest[meta.id];
    delete idToTest[meta.id];
    if (idMap && idMap.jsFileName) {
      delete testJsToId[idMap.jsFileName];
    }
  }
}

export function terminate() {
  if (watcher) {
    watcher.close();
  }
}

interface IFileMeta {
  id: string;
  type: "js" | "side" | undefined;
}

async function getMeta(path: string): Promise<IFileMeta> {
  if (sideFiles.exec(path)) {
    const sideContent = JSON.parse(
      (await util.promisify(fs.readFile)(path)).toString()
    ) as Project;
    return {
      id: sideContent.id,
      type: "side"
    };
  } else if (testFiles.exec(path)) {
    const jsContent = (await util.promisify(fs.readFile)(
      path
    )).toString() as string;
    const match = /^\s*\/\/\s*project_id:\s*([\d\w-]+)\s*$/gm.exec(jsContent);
    if (match && match.length > 1) {
      return { id: match[1], type: "js" };
    }
  }
  return { id: "", type: undefined };
}

async function loadData(path: string) {
  let data: any = {};

  try {
    const meta = await getMeta(path);
    data.id = meta.id;
    switch (meta.type) {
      case "js":
        data.jsFileName = path;
        data.jsContent = (await util.promisify(fs.readFile)(
          path
        )).toString() as string;
        break;
      case "side":
        data.sideFileName = path;
        data.sideContent = JSON.parse(
          (await util.promisify(fs.readFile)(path)).toString()
        ) as Project;
        break;
      default:
        return;
    }

    const completeData: IMapIdToTest = Object.assign(
      {
        id: "",
        sideFileName: "",
        jsFileName: ""
      },
      idToTest[data.id],
      data
    );

    idToTest[completeData.id] = completeData;
    if (completeData.jsFileName) {
      testJsToId[completeData.jsFileName] = completeData;
    }
  } catch (e) {
    console.error(e);
  }
}

export function extractLineNum(fileName: string, message: string) {
  console.log("Extracting file error line %s", fileName);
  const match = new RegExp(`at\\s+.+\\s\\(.*${fileName}:(\\d+):(\\d+)\\)`).exec(
    message
  );
  if (match) {
    return Number(match[1]);
  }
  return null;
}

export function getTestMap(projectId: string): IMapIdToTest | undefined {
  return idToTest[projectId];
}

export function getProjectId(fileName: string) {
  return testJsToId[fileName] && testJsToId[fileName].id;
}

export function getCommandId(projectId: string, lineNum: number) {
  const testMap = idToTest[projectId];
  if (!testMap) {
    return null;
  }

  const cmdIds = (testMap.jsContent || "")
    .split("\n")
    .slice(0, lineNum)
    .map(line => /^\s*\/\/\s*command_id:\s*([\d\w-]+)\s*$/gm.exec(line))
    .filter(match => match);

  const last = cmdIds[cmdIds.length - 1];
  if (!last) {
    return null;
  }
  return last[1];
}
