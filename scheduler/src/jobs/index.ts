import { ObjectId } from "bson";
import { Job } from "agenda";
import Agenda = require("agenda");

import radish from "./radish";

export type JobId = ObjectId | string;

export interface JobOverview {
  id: JobId;
  name: string; // Job name (ex. ui test)
  description?: string;
  state: "finished" | "running" | "pending";

  success: boolean;

  queuedAt: string;
  scheduledAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export type Processors = "radish";

export interface IJobProcessor {
  define(agenda: Agenda): void;

  /* Defines an initial data that will be saved onto database */
  getInitialData(options?: any): any;
  /* Defines an additional data that is appended to the response of querying detail of a job */
  getAdditionalDetail(job: Job): any;
}

export const processors: Record<Processors, IJobProcessor> = {
  radish
};

export interface JobCreation<T extends any = any> {
  processor: Processors;
  when?: string;
  data?: T;
}
//
// export function extractJobOverview(job: Job): JobOverview {
//   const { _id, name, failedAt } = job.attrs;
//   const { queuedAt } = job.attrs.data;
//   return {
//     id: _id,
//     name,
//     success: Boolean(failedAt),
//     queuedAt
//   };
// }
