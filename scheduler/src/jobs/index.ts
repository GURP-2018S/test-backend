import { ObjectId } from "bson";
import Agenda = require("agenda");

import radish from "./radish";

export type JobId = ObjectId;

export type Job<
  T extends Agenda.JobAttributesData = Agenda.JobAttributesData
> = Agenda.Job<JobAttributesExtension & T>;

export interface JobAttributesExtension {
  queuedAt: string;
}

export interface JobOverview {
  id: JobId;
  name: string; // Job name (ex. ui test)
  description?: string;
  state: "finished" | "running" | "pending";

  success: boolean;

  queuedAt: string;
  scheduledAt?: string;
  startedAt?: string;
  finishedAt?: string;
}

export type Processors = "radish";

export interface IJobProcessor {
  define(agenda: Agenda): void;

  /* Defines an initial options that will be saved onto database */
  getInitialData(options?: any): any;
  /* Defines an additional options that is appended to the response of querying detail of a job */
  getAdditionalDetail(job: Job): any;
}

export const processors: Record<Processors, IJobProcessor> = {
  radish
};

export interface JobCreation<T extends any = any> {
  processor: Processors;
  when?: string;
  options?: T;
}

export function getJobOverview(job: Job): JobOverview {
  const { _id, name, lastRunAt, lastFinishedAt, failedAt, nextRunAt } = job.attrs;
  const { queuedAt } = job.attrs.data;

  // millisecond 단위 이상으로 차이가 나야 schedule된 것임
  const scheduled = (nextRunAt.getTime() - 5) > (new Date()).getTime();
  const finished = !scheduled && Boolean(lastFinishedAt);
  const running = !(scheduled || finished);

  const state = running ? 'running' : (finished ? 'finished' : 'pending');
  return {
    id: _id,
    name,
    state,
    success: !Boolean(failedAt),
    queuedAt,
    scheduledAt: nextRunAt ? nextRunAt.toISOString() : undefined,
    startedAt: lastRunAt ? lastRunAt.toISOString() : undefined,
    finishedAt: lastFinishedAt ? lastFinishedAt.toISOString() : undefined
  };
}
