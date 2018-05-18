import Agenda = require("agenda");
import express = require("express");
import { Application } from "express";

import buildRouter from "./router";

const agenda = new Agenda();
agenda.database("mongodb://127.0.0.1:27017/agenda").name("Hello Queue");

const app: Application = express();
const port: number = Number(process.env.PORT) || 3000;
app.use("/jobs", buildRouter(agenda));
app.listen(port);

agenda.on("ready", () => {
  agenda.start();
});

function graceful() {
  agenda.stop(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", graceful);
process.on("SIGINT", graceful);
