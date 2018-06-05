import { ObjectId } from "bson";
import Agenda = require("agenda");

import radish from "./radish";
import jestAgenda from "./jest";

import { JobAttributes } from "agenda";

export type JobId = ObjectId;

export type Job = Agenda.Job<JobAttributesExtension>;

export interface JobAttributesExtension extends JobAttributes {
  queuedAt: string;
}

type JobState = "finished" | "running" | "pending";

export interface JobOverview {
  /* ID used to make a job distinct */
  id: JobId;
  /* The name of job processor*/
  name: string;
  /* Optional description of the job */
  description?: string;
  /* Job status */
  state: JobState;

  success: boolean;

  queuedAt: string;
  scheduledAt?: string;
  startedAt?: string;
  finishedAt?: string;
}

export type Processors = "radish" | "jest";

export interface IJobProcessor {
  define(agenda: Agenda): void;

  /* Defines an initial options that will be saved onto database */
  getInitialData(options?: any): any;

  /* Defines an additional options that is appended to the response of querying detail of a job */
  getAdditionalDetail(queryResult: JobQueryResult): any;
}

export const processors: Record<Processors, IJobProcessor> = {
  radish,
  jest: jestAgenda
};

export interface JobCreation<T extends any = any> {
  processor: Processors;
  when?: string;
  options?: T;
}

export interface JobQueryResult<
  T extends JobAttributesExtension = JobAttributesExtension
> {
  job: JobAttributes<T>;
  _id: ObjectId;
  running: boolean;
  scheduled: boolean;
  queued: boolean;
  finished: boolean;
}

export const ordinarySortQuery = {
  $sort: {
    nextRunAt: -1,
    lastRunAt: -1,
    lastFinishedAt: -1
  }
};

/* Returns mongoDB aggregate pipelines*/
export function getJobsQuery(): any[] {
  return [
    {
      $project: {
        _id: 0,
        job: "$$ROOT",
        nextRunAt: { $ifNull: ["$nextRunAt", 0] },
        lockedAt: { $ifNull: ["$lockedAt", 0] },
        lastRunAt: { $ifNull: ["$lastRunAt", 0] },
        lastFinishedAt: { $ifNull: ["$lastFinishedAt", 0] },
        failedAt: { $ifNull: ["$failedAt", 0] },
        repeatInterval: { $ifNull: ["$repeatInterval", 0] }
      }
    },
    {
      $project: {
        job: "$job",
        _id: "$job._id",
        running: {
          $and: ["$lastRunAt", { $gt: ["$lastRunAt", "$lastFinishedAt"] }]
        },
        scheduled: {
          $and: ["$nextRunAt", { $gte: ["$nextRunAt", new Date()] }]
        },
        queued: {
          $and: [
            "$nextRunAt",
            { $gte: [new Date(), "$nextRunAt"] },
            { $gte: ["$nextRunAt", "$lastFinishedAt"] }
          ]
        },
        finished: {
          $and: ["$lastFinishedAt", { $gt: ["$lastFinishedAt", "$lastRunAt"] }]
        }
      }
    }
  ];
}

export function getJobOverview(queryResult: JobQueryResult): JobOverview {
  const { running, finished, queued, scheduled } = queryResult;
  const {
    _id,
    name,
    lastRunAt,
    lastFinishedAt,
    failedAt,
    nextRunAt
  } = queryResult.job;
  const { queuedAt } = queryResult.job.data;

  // Schedule 시간이 이미 지난 경우 nextRunAt이 null임
  // millisecond 단위 이상으로 차이가 나야 schedule된 것임
  // 그렇지 않은 경우 lock이 걸린 상태이거나, 실행중인 경우임

  // const scheduled = nextRunAt.getTime() - 5 > new Date().getTime();
  // const finished = !scheduled && Boolean(lastFinishedAt);
  // const running = lastRunAt && !finished;
  // const queued = !scheduled && !running;

  let state: JobState | undefined;
  if (running) {
    state = "running";
  } else if (queued && scheduled) {
    state = "pending";
  } else if (finished) {
    state = "finished";
  } else {
    console.error("Undefined job state");
    state = "running";
  }

  return {
    id: _id,
    name,
    state,
    success: !Boolean(failedAt),
    queuedAt,
    scheduledAt: scheduled ? nextRunAt.toISOString() : undefined,
    startedAt: lastRunAt ? lastRunAt.toISOString() : undefined,
    finishedAt: lastFinishedAt ? lastFinishedAt.toISOString() : undefined
  };
}
