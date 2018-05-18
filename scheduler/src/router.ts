import { schedule as scheduleRadish } from "./jobs/radish";
import { Router } from "express";
import Agenda = require("agenda");

import defineRadish from "./jobs/radish";
import { Job } from "agenda";

export default function buildRouter(agenda: Agenda) {
  defineRadish(agenda);

  const router = Router();

  router.get("/", (_, res) => {
    agenda.jobs({ name: "radish" }, (err?: Error, jobs?: Job[]) => {
      if (err) {
        console.error(err);
        res.status(500).send(err);
      }
      if (jobs) {
        res.send(JSON.stringify(jobs.map(job => job.attrs)));
      } else {
        res.send("[]");
      }
    });
  });

  router.get("/create", (_, res) => {
    res.send("Bear with me. I'll create a job");
    scheduleRadish(agenda, "hello.feature");
  });

  router.get("/:id", (_, res) => {
    res.send("Deleting the job");
  });

  router.get("/purge", (_, res) => {
    agenda.purge();
    res.send("Purge");
  });

  router.use((_, res) => {
    res.status(404).send("Not found");
  });

  return router;
}
