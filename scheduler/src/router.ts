import { Router } from "express";
import Agenda = require("agenda");
import bodyParser = require("body-parser");
import multiparty = require("multiparty");
import cors = require("cors");

import {
  Job,
  JobCreation,
  Processors,
  processors,
  getJobOverview,
  getJobsQuery,
  ordinarySortQuery,
  runningProcesses
} from "./jobs";
import { ObjectId } from "bson";
import { Db } from "mongodb";
import { convertSideToJS } from "./libs/selianize";
import * as util from "util";
import * as fs from "fs";
// import { getTestMap } from "./libs/testWatcher";

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function buildJobRouter(agenda: Agenda, db: Db, collection: string) {
  Object.entries(processors).map(([_, p]) => p.define(agenda));

  const router = Router();

  router.use(cors());
  router.use(bodyParser.json());

  // GET /
  // Get a job list
  router.get("/", async (req, res) => {
    const query: any = {};

    try {
      if (req.query && req.query.processor) {
        query.name = req.query.processor;
      }

      // Customized job query
      const jobData = await db
        .collection(collection)
        .aggregate([ordinarySortQuery].concat(getJobsQuery()))
        .toArray();

      if (jobData) {
        res.json(
          jobData.map(queryResult =>
            Object.assign(
              {},
              getJobOverview(queryResult),
              processors[
                queryResult.job.name as Processors
              ].getAdditionalDetail(queryResult)
            )
          )
        );
      } else {
        res.json([]);
      }
    } catch (err) {
      if (err) {
        console.error(err);
        res.status(500).send(err);
      }
    }
  });

  // POST /
  // Schedule a job
  router.post("/", (req, res) => {
    console.log("Got an request");

    const { processor, when, options } = req.body as JobCreation;
    let initialData: any = {};
    if (processors[processor]) {
      // res.send("Bear with me. I'll create a job");
      initialData = processors[processor].getInitialData(options);
    } else {
      res.status(400).json({ error: "Undefined job processor " + processor });
      return;
    }

    initialData.queuedAt = new Date();

    let newJob: Job;
    if (when) {
      newJob = agenda.schedule(when, processor, initialData);
    } else {
      newJob = agenda.now(processor, initialData);
    }
    // newJob.save();

    async function waitUntilGetId() {
      while (!newJob.attrs._id) {
        await sleep(10);
      }
      res.json({ message: "success", id: newJob.attrs._id });
    }
    waitUntilGetId();
  });

  router.get("/purge", (_, res) => {
    agenda.purge();
    res.send("Purge");
  });

  router.get("/:id", async (req, res) => {
    try {
      const jobs = await db
        .collection(collection)
        .aggregate(
          [
            {
              $match: {
                _id: new ObjectId(req.params.id)
              }
            },
            ordinarySortQuery
          ].concat(getJobsQuery())
        )
        .toArray();

      if (jobs && jobs.length > 0) {
        const queryResult = jobs[0];
        const processor = queryResult.job.name as Processors;
        res.json(
          Object.assign(
            {},
            getJobOverview(queryResult),
            processors[processor].getAdditionalDetail(queryResult)
          )
        );
      } else {
        res.status(404).json();
      }
    } catch (e) {
      console.error(e);
      res.status(500).end();
    }
  });

  // router.put("/:id");

  router.delete("/:id", (req, res) => {
    if (!req.params.id) {
      res.status(404).send("Not found");
      return;
    }

    agenda.cancel({ _id: new ObjectId(req.params.id) }, (error, numRemoved) => {
      const child = runningProcesses[req.params.id];
      if (child) {
        child.kill();
      }
      if (numRemoved) {
        res.json({ message: "success" });
        return;
      } else if (!numRemoved || error) {
        res.status(500).json({ message: "failed" });
        return;
      }
    });
  });

  router.use((_, res) => {
    res.status(404).send("Not found");
  });

  return router;
}

export function buildConvertRouter() {
  const router = Router();

  router.use(cors());
  router.use(bodyParser.json());

  // Convert side to JS
  router.post("/side/js", async (req, res) => {
    try {
      const contentType = req.header("Content-Type");
      let content;
      // Multipart
      if (contentType && contentType.startsWith("multipart")) {
        const form = new multiparty.Form();

        content = await new Promise<string>((res, rej) => {
          form.parse(req, async (_, __, files) => {
            const fileList: any[] = files.file;
            if (!fileList.length) {
              rej("No files object provided");
            }
            const file = fileList.find(file => file.fieldName === "file");
            if (file && file.path) {
              res(
                JSON.parse(
                  (await util.promisify(fs.readFile)(file.path)).toString()
                )
              );
            } else {
              rej("No file has been uploaded");
            }
          });
        });
      } else {
        // JSON
        content = req.body;
      }
      res.contentType("plain/text").send(await convertSideToJS(content));
    } catch (e) {
      res.status(500).send(e);
    }
  });

  router.use((_, res) => {
    res.status(404).send("Not found");
  });

  return router;
}

export function buildSideRouter() {
  const router = Router();

  router.use(cors());
  router.use(bodyParser.json());

  // router.get("/:projectId", async (req, res) => {
  //   try {
  //     const testMap = getTestMap(req.params.projectId);
  //     if (testMap) {
  //       res.json(testMap.sideContent);
  //     } else {
  //       res.status(404).json();
  //     }
  //   } catch (e) {
  //     res.status(500).send(e);
  //   }
  // });

  router.use((_, res) => {
    res.status(404).send("Not found");
  });

  return router;
}
