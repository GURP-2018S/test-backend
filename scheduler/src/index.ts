import Agenda = require("agenda");
import express = require("express");
import { Application } from "express";
import { MongoClient } from "mongodb";

import buildRouter from "./router";

const DB_NAME = "agenda";
const COLL_NAME = "agendaJobs";
const agenda = new Agenda();

let client: MongoClient;

(async function load() {
  try {
    client = await MongoClient.connect("mongodb://127.0.0.1:27017");
    const db = client.db(DB_NAME);

    agenda.mongo(db, COLL_NAME).name("Radish-BDD Queue");

    const app: Application = express();
    const port: number = Number(process.env.PORT) || 3000;
    app.use("/jobs", buildRouter(agenda, db, COLL_NAME));
    app.listen(port);
  } catch (e) {
    console.error(e);
  }
})();

agenda.on("ready", () => {
  agenda.start();
});

function graceful() {
  agenda.stop(() => {
    process.exit(0);
    if (client) {
      client.close();
    }
  });
}

process.on("SIGTERM", graceful);
process.on("SIGINT", graceful);
