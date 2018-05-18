import { Router } from "express";
import Agenda = require("agenda");
import bodyParser = require("body-parser");

import { Job } from "agenda";
import { JobCreation, Processors, processors } from "./jobs";
import { ObjectId } from "bson";

export default function buildRouter(agenda: Agenda) {
  Object.entries(processors).map(([_, p]) => p.define(agenda));

  const router = Router();

  router.use(bodyParser.json());

  // GET /
  // Get a job list
  router.get("/", (req, res) => {
    const query: any = {};
    if (req.query && req.query.processor) {
      query.name = req.query.processor;
    }

    agenda.jobs(
      query,
      (err?: Error, jobs?: Job[]) => {
        if (err) {
          console.error(err);
          res.status(500).send(err);
        }

        if (jobs) {
          res.json(jobs.map(job => job.attrs));
        } else {
          res.json([]);
        }
      }
    );
  });

  // POST /
  // Schedule a job
  router.post("/", (req, res) => {
    const { processor, when, data } = req.body as JobCreation;
    let initialData: any = {};
    if (processors[processor]) {
      res.send("Bear with me. I'll create a job");
      initialData = processors[processor].getInitialData(data);
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
    res.json({ message: "success", id: newJob.attrs._id });
  });

  router.get("/purge", (_, res) => {
    agenda.purge();
    res.send("Purge");
  });

  router.get("/:id", (req, res) => {
    function sendJobDetail(err?: Error, jobs?: Job[]) {
      if (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
      } else if (jobs && jobs.length) {
        const job = jobs[0];
        const processor = job.attrs.name as Processors;
        // TODO:: Add default overview data
        res.json(
          Object.assign({}, processors[processor].getAdditionalDetail(job))
        );
      } else {
        res.json();
      }
    }
    agenda.jobs({ _id: new ObjectId(req.params.id) }, sendJobDetail);
  });

  router.put("/:id");

  router.delete("/:id");

  router.use((_, res) => {
    res.status(404).send("Not found");
  });

  return router;
}
