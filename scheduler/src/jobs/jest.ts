import * as path from "path";
import * as fs from "fs";

import { spawn } from "child_process";
import { IJobProcessor, JobAttributesExtension, JobQueryResult } from "./index";
import * as util from "util";
import Agenda = require("agenda");
import lodash = require("lodash");
import {
  extractLineNum,
  getCommandId,
  getProjectId
} from "../libs/testWatcher";

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
  projectResults: IProjectResult[];
}

interface IProjectResult {
  success: boolean;
  startTime: number;
  endTime: number;
  fileName: string;
  id: string;
  suiteResults: ITestSuiteResult[];
}

interface ITestSuiteResult {
  // Top-level Information
  name: string;
  status: "passed" | "failed";
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
  status: "passed" | "failed";

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

        // TODO:: Need to convert Jest Output JSON to own output format somehow
        const rawJson = JSON.parse(
          (await util.promisify(fs.readFile)(
            path.join(dir, "result.json")
          )).toString()
        );

        job.attrs.data.result = convertJson(rawJson);
        console.log("Running job finished");

        done();
      } catch (err) {
        console.error(err);
        job.fail(err.message);
        done();
        console.log("Running job failed");
      }
    }
  );
}

function convertJson(raw: any): ITestJobResult {
  const {
    numTotalTestSuites,
    numTotalTests,
    numFailedTestSuites,
    numFailedTests,
    numPassedTestSuites,
    numPassedTests,
    numPendingTestSuites,
    numPendingTests,
    numRuntimeErrorTestSuites,
    success,
    wasInterrupted,
    startTime
  } = raw;

  const result = {
    numTotalTestSuites,
    numTotalTests,
    numFailedTestSuites,
    numFailedTests,
    numPassedTestSuites,
    numPassedTests,
    numPendingTestSuites,
    numPendingTests,
    numRuntimeErrorTestSuites,
    success,
    wasInterrupted,
    startTime,

    projectResults: [] as IProjectResult[]
  };

  const projects = Object.entries(
    lodash.groupBy(raw.testResults, suiteResult => suiteResult.name)
  ).map(([fileName, suites]) => {
    const projectId = getProjectId(fileName);
    return {
      success: suites.every(suite => suite.status === "passed"),
      startTime: lodash.minBy(suites, suite => suite.startTime)
        .startTime as number,
      endTime: lodash.maxBy(suites, suite => suite.endTime).endTime as number,
      fileName,
      id: projectId,
      suiteResults: suites.map(prevSuite => {
        const { status, summary, message, startTime, endTime } = prevSuite;

        return {
          name: prevSuite.assertionResults[0].ancestorTitles[0],
          status,
          summary,
          message,
          startTime,
          endTime,
          assertionResults: prevSuite.assertionResults.map((test: any) => {
            const { failureMessages } = test;
            let location: string | null = null;
            if (failureMessages.length > 0) {
              const lineNum = extractLineNum(fileName, failureMessages[0]);
              if (lineNum) {
                location = getCommandId(projectId, lineNum);
              }
            }
            return {
              title: test.title,
              fullName: test.fullName,
              ancestorTitles: test.ancestorTitles,
              status: test.status,
              failureMessages: test.failureMessages,
              location
            };
          })
        };
      })
    };
  });

  result.projectResults = projects;
  return result;
}

const jobProcessor: IJobProcessor = {
  define: defineRadish,
  getInitialData,
  getAdditionalDetail
};

export default jobProcessor;
