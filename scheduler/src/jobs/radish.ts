import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";
import Agenda = require("agenda");
import { Job, JobOverview, IJobProcessor } from "./index";
import assert = require("assert");

export interface JobDetail extends JobOverview, JobAdditionalDetail {}

export interface JobAdditionalDetail {
  result: FeatureResult[];
  success: boolean;
}

export interface FeatureResult {
  success: boolean;
  name: string;
  result: ScenarioResult[];
}

export interface ScenarioResult {
  success: boolean;
  name: string;
  description: string;
  steps: StepData[];
  failureDetail?: {
    // step: string;
    /* Position in the list 'steps' of result*/
    index: number;
    reason: string;
  };
}

export interface StepData {
  keyword: Cucumber.Keywords;
  name: string;
  line: number;
  duration: number;
}

type Everything = "*";

export interface IRadishOptions {
  feature: Everything | string;
}

interface RadishJobData {
  dir: string;
  filename: string;
  result?: Cucumber.JsonResult;
}

/* Cucumber JSON Type Definitions*/
namespace Cucumber {
  export type JsonResult = FeatureResult[];

  export interface FeatureResult {
    name: string;
    description: string;
    elements: ScenarioResult[];
    id: string;
    keyword: "Feature";
    line: number;
    tags: string[];
    type: "feature";
    uri: string;
  }

  export interface ScenarioResult {
    name: string;
    description: string;
    steps: StepResult[];
    keyword: "Scenario";
    line: number;
    tags: string[];
    type: "scenario";
  }

  type StepStatus = "failed" | "passed" | "skipped";

  export interface StepResult {
    name: string;
    result: {
      duration: number;
      status: StepStatus;
      error_message?: string;
    };
    keyword: Keywords;
    line: number;
  }

  export type Keywords = "Given" | "When" | "Then";
}

const convertFeature = (feature: Cucumber.FeatureResult): FeatureResult => {
  const scenarioResult = feature.elements.map(convertScenario);
  return {
    success: scenarioResult.some(s => s.success),
    name: feature.name,
    result: scenarioResult
  };
};

const convertScenario = (scenario: Cucumber.ScenarioResult): ScenarioResult => {
  const failedStepIndex = scenario.steps.findIndex(
    step => step.result.status === "failed"
  );

  return {
    name: scenario.name,
    description: scenario.description,
    success: failedStepIndex === -1,
    steps: scenario.steps.map(convertStep),
    failureDetail:
      failedStepIndex !== -1
        ? {
            // step: scenario.steps[failedStepIndex].name,
            index: failedStepIndex,
            reason: scenario.steps[failedStepIndex].result
              .error_message as string
          }
        : undefined
  };
};

const convertStep = (step: Cucumber.StepResult): StepData => ({
  keyword: step.keyword,
  name: step.name,
  line: step.line,
  duration: step.result.duration
});

function cucumberJsonToResponse(json: Cucumber.JsonResult) {
  return json.map(convertFeature);
}

function getInitialData(options?: IRadishOptions): RadishJobData {
  let filename = ".";
  if (options) {
    filename = options.feature === "*" ? "." : options.feature;
  }
  return {
    dir: path.join(process.cwd(), "../features"),
    filename
  };
}

function getAdditionalDetail(job: Job<RadishJobData>): JobAdditionalDetail {
  assert(
    job.attrs.data.result,
    "CucumberJSON in the job.attrs.data.result does not exist"
  );
  const json = <Cucumber.FeatureResult[]>job.attrs.data.result;
  const result = cucumberJsonToResponse(json);
  return {
    success: result.every(feature => feature.success),
    result
  };
}

function defineRadish(agenda: Agenda) {
  agenda.define(
    "radish",
    { concurrency: 1 },
    (job: Agenda.Job<RadishJobData>, done) => {
      const { dir, filename } = job.attrs.data;
      // const fullPath = path.join(dir, filename);
      const resultFile = path.join(dir, "result.json");

      const handleRadishOutput = () => {
        fs.readFile(path.join(dir, "result.json"), saveResultToDB);
      };

      const saveResultToDB = (err: NodeJS.ErrnoException, data: Buffer) => {
        if (err) {
          console.error(err);
          job.fail(err.message);
          job.save();
          console.log("Job failed");
        } else {
          const json = JSON.parse(data.toString());
          job.attrs.data.result = json;
          const result = cucumberJsonToResponse(json);
          if (result.every(feature => feature.success)) {
            done();
            console.log("job succeed");
          } else {
            job.fail("Some of the features have failed");
            job.save();
            console.log("job failed");
          }
        }
      };

      const outputSTDOut = (buffer: Buffer) => {
        console.log(buffer.toString());
      };

      if (fs.existsSync(resultFile)) {
        fs.unlinkSync(resultFile);
      }
      const cmd = `radish`;
      console.log("Running", cmd);
      const child = spawn(
        cmd,
        [filename, "--cucumber-json=result.json", "--basedir=./radish"],
        {
          cwd: dir
        }
      );
      child.stdout.on("data", outputSTDOut);
      child.stderr.on("data", data => console.log(`stderr: ${data}`));
      child.on("close", handleRadishOutput);
    }
  );
}

const jobProcessor: IJobProcessor = {
  define: defineRadish,
  getInitialData,
  getAdditionalDetail
};

export default jobProcessor;
