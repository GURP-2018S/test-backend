import * as fs from "fs";
import * as path from "path";
import * as util from "util";
import { js_beautify as beautify } from "js-beautify";
import Project = Selianize.Project;

const mkdir = util.promisify(fs.mkdir);
const access = util.promisify(fs.access);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const deleteFile = util.promisify(fs.unlink);
const copyFile = util.promisify(fs.copyFile);

// testDir will be created
export function writeTests(sideDir: string, testDir: string) {
  return Promise.all(
    fs
      .readdirSync(sideDir)
      .filter(fileName => path.extname(fileName).endsWith(".side"))
      .map(fileName => {
        const sideContent = readSide(path.join(sideDir, fileName));
        const projectName = path.basename(fileName, ".side");
        const projectDir = path.join(testDir, projectName);
        return mkdir(testDir)
          .then(() => initDirectory(projectDir))
          .then(() =>
            copyFile(
              path.join(sideDir, projectName + ".side"),
              path.join(projectDir, projectName + ".side")
            )
          )
          .then(() => sideContent)
          .then((project: Project) => {
            return Promise.all(
              project.code.map(suiteCode => {
                const suiteName = suiteCode.name;
                const suitePath = path.join(projectDir, suiteName) + ".test.js";
                return writeFile(suitePath, beautify(suiteCode.code));
              })
            );
          })
          .then(() => { console.log('Wrote test for', projectName)});
      })
  );
}

export async function readSide(filePath: string) {
  return await readFile(filePath).then(buf => {
    return JSON.parse(buf.toString()) as Project;
  });
}

// create a directory or remove all the entries of a directory
export function initDirectory(dir: string) {
  return new Promise((res, rej) => {
    const existPromise = access(dir, fs.constants.F_OK);

    existPromise
      .then(() =>
        Promise.all(
          fs
            .readdirSync(dir)
            .map(fileName => deleteFile(path.join(dir, fileName)))
        )
      )
      .then(() => res())
      .catch(() =>
        mkdir(dir).then(() => {
          console.log("Created", dir);
          res();
        })
      )
      .catch(e => rej(e));
  });
}
