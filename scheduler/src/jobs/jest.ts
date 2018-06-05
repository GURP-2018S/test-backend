import * as path from "path";
import * as fs from "fs";

import { spawn } from "child_process";
import { IJobProcessor, JobAttributesExtension, JobQueryResult } from "./index";
import * as util from "util";
import Agenda = require("agenda");

export interface JobAdditionalDetail {
  success: boolean;
  result: any;
}

type Everything = "*";

export interface JestOptions {
  project: Everything | string;
}

/* Additional job data to run radish */
interface JestJobData {
  dir: string;
  testName: string;
  result?: ITestJobResult;
}

interface ITestJobResult {
  // Number of total tests
  numTotalTestSuites: number;
  numTotalTests: number;
  numFailedTestSuites: number;
  numFailedTests: number;
  numPassedTestSuites: number;
  numPassedTests: number;
  numPendingTestSuites: number;
  numPendingTests: number;
  numRuntimeErrorTestSuites: number;

  // Top-level Information
  success: boolean;
  wasInterrupted: boolean;
  startTime: number;

  // Result of Each Test Suite
  projectResult: any[];
  testResults: ITestSuiteResult[];
}

interface ITestSuiteResult {
  // Top-level Information
  name: string;
  status: "passed" | "failed" | "pending";
  summary: string;

  // WHAT IS THIS?
  message: string;

  // Result of Each Test
  assertionResults: ITestResult[];

  // Time
  startTime: number;
  endTime: number;
}

interface ITestResult {
  // Top-level Information
  title: string;
  ancestorTitles: string[]; // WHAT IS THIS?
  fullName: string; // WHAT IS THIS?
  status: "passed" | "failed" | "pending";

  // WHAT IS THIS?
  failureMessages: string[];
  location: null | string;
}

function getInitialData(options?: JestOptions): JestJobData {
  let filename = ".";
  if (options) {
    filename = options.project === "*" ? "." : options.project;
  }
  return {
    dir: path.join(process.cwd(), "../test-environment"),
    testName: filename
  };
}

function getAdditionalDetail(
  queryResult: JobQueryResult<JestJobData & JobAttributesExtension>
): JobAdditionalDetail {
  if (!queryResult.job.data.result) {
    return { result: [], success: true };
  }

  const result = queryResult.job.data.result;
  return {
    success: result.success,
    result
  };
}

function defineRadish(agenda: Agenda) {
  agenda.define(
    "jest",
    { concurrency: 1 },
    async (job: Agenda.Job<JestJobData>, done) => {
      try {
        const { dir } = job.attrs.data;

        console.log("Running jest");
        const child = spawn(
          "npx",
          ["jest", ".", "--json", "--outputFile=result.json"],
          {
            cwd: dir
          }
        );
        child.stdout.on("data", (buffer: Buffer) => {
          console.log(buffer.toString());
        });
        child.stderr.on("data", data => console.log(`stderr: ${data}`));
        await new Promise(res => child.on("close", () => res()));
        const data = await util.promisify(fs.readFile)(
          path.join(dir, "result.json")
        );
        // const json = JSON.parse(data.toString());

        // TODO:: Need to convert Jest Output JSON to own output format somehow
        // const result = cucumberJsonToResponse(json);

        job.attrs.data.result = JSON.parse(data.toString());
        console.log("job succeed");

        // if (result.every(feature => feature.success)) {
        //   console.log("job succeed");
        // } else{
        //   job.fail("Some of the features have failed");
        //   console.log("job failed");
        // }
        done();
      } catch (err) {
        console.error(err);
        job.fail(err.message);
        done();
        console.log("Job failed");
      }
    }
  );
}

const jobProcessor: IJobProcessor = {
  define: defineRadish,
  getInitialData,
  getAdditionalDetail
};

export default jobProcessor;
