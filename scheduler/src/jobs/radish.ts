import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";
import Agenda = require("agenda");

export interface IFeatureData {
  dir: string;
  filename: string;
  result?: string;
}

export function schedule(agenda: Agenda, filename: string) {
  agenda.now<IFeatureData>("radish", {
    dir: path.join(process.cwd(), "../features"),
    filename
  });
}

export default function defineRadish(agenda: Agenda) {
  agenda.define(
    "radish",
    { concurrency: 1 },
    (job: Agenda.Job<IFeatureData>, done) => {
      const { dir, filename } = job.attrs.data;
      const fullPath = path.join(dir, filename);

      const handleRadishOutput = () => {
        fs.readFile(path.join(dir, "result.json"), saveResultToDB);
      };

      const saveResultToDB = (err: NodeJS.ErrnoException, data: Buffer) => {
        if (err) {
          console.error(err);
        }

        job.attrs.data.result = JSON.parse(data.toString());
        console.log("done job");
        done();
      };

      const outputSTDOut = (buffer: Buffer) => {
        console.log(buffer.toString());
      };

      const child = spawn(
        "radish",
        [fullPath, "--cucumber-json", "result.json", "--base-dir", dir],
        {
          cwd: dir
        }
      );
      child.stdout.on("data", outputSTDOut);
      child.on("exit", handleRadishOutput);
    }
  );
}
