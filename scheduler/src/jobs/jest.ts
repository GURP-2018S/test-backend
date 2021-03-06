import * as path from "path";
// import * as fs from "fs";

import { spawn } from "child_process";
import {
  IJobProcessor,
  JobAttributesExtension,
  JobQueryResult,
  runningProcesses,
  Job
} from "./index";
import Agenda = require("agenda");
import lodash = require("lodash");

import * as util from "util";
import * as fs from "fs";

import Command = Selianize.Command;
import { writeTests } from "../libs/sideManager";
import Project = Selianize.Project;

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
  commands?: ITestCommand[];
}

interface ITestCommand {
  id: string;
  comment: string;
  command: string;
  target: string;
  value: string;
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

function defineJest(agenda: Agenda) {
  agenda.define(
    "jest",
    { concurrency: 1 },
    async (job: Job<JestJobData>, done) => {
      try {
        const { dir, queuedAt } = job.attrs.data;
        const testDir = path.join(dir, "test-" + new Date(queuedAt).getTime());
        console.log("Generating test files");
        await writeTests(path.join(dir, "__side__"), testDir);
        const testResultPath = path.join(testDir, "result.json");
        // if (fs.existsSync(testResultPath)) {
        //   fs.unlinkSync(testResultPath)
        // }
        console.log("Running jest");
        console.log(dir);
        const child = spawn(
          "npx",
          ["jest", testDir, "--runInBand", "--json", `--outputFile=${testResultPath}`],
          {
            cwd: dir
          }
        );
        runningProcesses[job.attrs._id.toHexString()] = child;
        child.stdout.on("data", (buffer: Buffer) => {
          console.log(buffer.toString());
        });
        child.stderr.on("data", data => console.log(`stderr: ${data}`));
        await new Promise(res => {
          child.on("close", () => {
            delete runningProcesses[job.attrs._id.toHexString()];
            res();
          });
        });

        // TODO:: Need to convert Jest Output JSON to own output format somehow
        const rawJson = JSON.parse(
          (await util.promisify(fs.readFile)(
            testResultPath
          )).toString()
        );

        job.attrs.data.result = convertJson(rawJson, dir);
        console.log("Running job finished");
        if (!job.attrs.data.result.success) {
          job.fail("Some tests have failed.");
        }
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

function convertJson(raw: any, dir: string): ITestJobResult {
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
    lodash.groupBy(raw.testResults, suiteResult =>
      path.dirname(suiteResult.name)
    )
  ).map(([projectDir, suites]) => {
    // Make sure that it is absolute
    projectDir = path.resolve(dir, projectDir);
    const projectName = lodash.last(projectDir.split(path.sep));
    const projectPath = path.join(projectDir, projectName + ".side");
    console.log("Reading project from", projectPath);
    console.log(fs.readdirSync(path.dirname(projectPath)));
    const projectContent = JSON.parse(
      fs.readFileSync(projectPath).toString()
    ) as Project;

    // Project Data
    return {
      success: suites.every(suite => suite.status === "passed"),
      startTime: lodash.minBy(suites, suite => suite.startTime)
        .startTime as number,
      endTime: lodash.maxBy(suites, suite => suite.endTime).endTime as number,
      fileName: projectDir,
      id: projectContent.id,
      suiteResults: suites.map(prevSuite => {
        const {
          status,
          summary,
          message,
          startTime,
          endTime,
          name: suiteJsPath
        } = prevSuite;
        const suiteName = path.basename(suiteJsPath, '.test.js');
        const suiteJsContent = fs.readFileSync(suiteJsPath).toString();
        return {
          name: suiteName,
          status,
          summary,
          message,
          startTime,
          endTime,
          assertionResults: prevSuite.assertionResults.map((test: any) => {
            const { failureMessages } = test;
            let location: string | null = null;
            if (failureMessages.length > 0) {
              const lineNum = extractLineNum(
                path.basename(suiteJsPath),
                failureMessages[0]
              );
              if (lineNum) {
                location = getCommandId(suiteJsContent, lineNum);
              }
            }

            let commands: Command[] = [];
            const sideTest = projectContent.tests.find(
              sideTest => sideTest.name === test.title
            );
            if (sideTest) {
              commands = sideTest.commands;
            }

            return {
              title: test.title,
              fullName: test.fullName,
              ancestorTitles: test.ancestorTitles,
              status: test.status,
              failureMessages: test.failureMessages,
              location,
              commands
            };
          })
        };
      })
    };
  });

  result.projectResults = projects;
  return result;
}

function extractLineNum(fileName: string, message: string) {
  console.log("Extracting file error line %s", fileName);
  const match = new RegExp(`at\\s+.+\\s\\(.*${fileName}:(\\d+):(\\d+)\\)`).exec(
    message
  );
  if (match) {
    return Number(match[1]);
  }
  return null;
}

function getCommandId(jsContent: string, lineNum: number) {
  const cmdIds = (jsContent || "")
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

const jobProcessor: IJobProcessor = {
  define: defineJest,
  getInitialData,
  getAdditionalDetail
};

export default jobProcessor;
