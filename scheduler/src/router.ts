import { schedule as scheduleRadish } from "./jobs/radish";
import { Router } from "express";
import Agenda = require("agenda");

import defineRadish from "./jobs/radish";

export default function buildRouter(agenda: Agenda) {
  defineRadish(agenda);

  const router = Router();

  router.get("/", (_, res) => {
    res.send("OK");
  });

  router.get("delete", (_, res) => {
    res.send("Deleting the job");
  });

  router.get("/create", (_, res) => {
    res.send("Bear with me. I'll create a job");
    scheduleRadish(agenda, "hello.feature");
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
