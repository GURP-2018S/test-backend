import selianize from "selianize";
import * as util from "util";
import * as path from "path";
import * as fs from "fs";

export async function convertSideToJS(baseDir: string, testName: string) {
  const resultFile = path.join(baseDir, "result.json");
  const testFolder = path.join(baseDir, "__test__");
  const sideFolder = path.join(baseDir, "side");

  if (await util.promisify(fs.exists)(resultFile)) {
    await util.promisify(fs.unlink)(resultFile);
  }

  if (await util.promisify(fs.exists)(testFolder)) {
    await util.promisify(fs.rmdir)(testFolder);
  }
  await util.promisify(fs.mkdir)(testFolder);

// Convert side to js
  const files = (await util.promisify(fs.readdir)(sideFolder)).filter(
    fileName => fileName.match(new RegExp(testName + /\.(json|side)$/))
  );

  const testFiles = files.map(file =>
    path.join(testFolder, file + ".test.js")
  );
  const sideFiles = files.map(file => path.join(sideFolder, file));

  console.log(files);
  const contents = await Promise.all(
    sideFiles.map(async file =>
      selianize(
        JSON.parse((await util.promisify(fs.readFile)(file)).toString())
      )
    )
  );

  return await Promise.all(
    testFiles.map((file, index) =>
      util.promisify(fs.writeFile)(file, contents[index])
    )
  );
}
