import selianize from "selianize";
import * as util from "util";
import * as path from "path";
import * as fs from "fs";
import Project = Selianize.Project;

const extension = "\\.(json|side)$";

export async function convertManySideToJS(baseDir: string, testName: string) {
  const resultFile = path.join(baseDir, "result.json");
  const testFolder = path.join(baseDir, "__test__");
  const sideFolder = path.join(baseDir, "side");

  if (await util.promisify(fs.exists)(resultFile)) {
    await util.promisify(fs.unlink)(resultFile);
  }

  if (await util.promisify(fs.exists)(testFolder)) {
    await Promise.all(
      (await util.promisify(fs.readdir)(testFolder)).map(file =>
        util.promisify(fs.unlink)(path.join(testFolder, file))
      )
    );
  } else {
    await util.promisify(fs.mkdir)(testFolder);
  }

  // Convert side to js
  const files = (await util.promisify(fs.readdir)(sideFolder)).filter(
    fileName => fileName.match(new RegExp(testName + extension))
  );
  console.log("Converting ", files);

  const testFiles = files.map(file =>
    path.join(testFolder, file.replace(new RegExp(extension), ".test.js"))
  );
  const sideFiles = files.map(file => path.join(sideFolder, file));

  const contents = await Promise.all(
    sideFiles.map(async file => {
      const content = <Project>(
        JSON.parse((await util.promisify(fs.readFile)(file)).toString())
      );
      return convertSideToJS(content);
    })
  );

  return await Promise.all(
    testFiles.map((file, index) =>
      util.promisify(fs.writeFile)(file, contents[index])
    )
  );
}

export async function convertSideToJS(side: Project) {
  const content = Object.assign({}, side, {
    tests: side.tests.map(test => {
      // Leave only that command exists
      return Object.assign({}, test, {
        commands: test.commands.filter(command => command.command)
      });
    })
  });
  return selianize(content);
}
