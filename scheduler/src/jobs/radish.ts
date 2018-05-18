import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";
import Agenda = require("agenda");
import { JobOverview, IJobProcessor } from "./index";
import { Job } from "agenda";
import assert = require("assert");

export interface JobDetail extends JobOverview, JobAdditionalDetail {}

export interface JobAdditionalDetail {
  result?: FeatureResult[];
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
  detail?: {
    step: string;
    index: number;
    reason: string;
  };
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
    keyword: "Given" | "When" | "Then";
    line: number;
  }
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
  const convertFeature = (feature: Cucumber.FeatureResult): FeatureResult => {
    const scenarioResult = feature.elements.map(convertScenario);
    return {
      success: scenarioResult.some(s => s.success),
      name: feature.name,
      result: scenarioResult
    };
  };

  const convertScenario = (
    scenario: Cucumber.ScenarioResult
  ): ScenarioResult => {
    const failedStepIndex = scenario.steps.findIndex(
      step => step.result.status === "failed"
    );

    return {
      name: scenario.name,
      description: scenario.description,
      success: failedStepIndex === -1,
      detail: failedStepIndex !== -1
        ? {
            step: scenario.steps[failedStepIndex].name,
            index: failedStepIndex,
            reason: scenario.steps[failedStepIndex].result
              .error_message as string
          }
        : undefined
    };
  };

  const result: FeatureResult[] = json.map(convertFeature);
  return {
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
        } else {
          job.attrs.data.result = JSON.parse(data.toString());
          console.log("job done");
          done();
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
