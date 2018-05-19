import Agenda = require("agenda");
import express = require("express");
import { Application } from "express";
import { MongoClient } from "mongodb";

import buildRouter from "./router";

const MONGODB_HOST = process.env.MONGODB_HOST || "localhost:27017";
const DB_NAME = process.env.DB_NAME || "agenda";
const COLL_NAME = process.env.COLL_NAME || "agendaJobs";
const agenda = new Agenda();

let client: MongoClient;

export interface ServerSettings {
  mongoURL: string;
  database: string;
  collection: string;
}

export async function load(settings: ServerSettings) {
  try {
    client = await MongoClient.connect(settings.mongoURL);
    const db = client.db(settings.database);

    agenda.mongo(db, settings.collection).name("Radish-BDD Queue");

    const app: Application = express();
    const port: number = Number(process.env.PORT) || 3000;
    app.use("/jobs", buildRouter(agenda, db, settings.collection));
    app.listen(port);
  } catch (e) {
    console.error(e);
  }
}

load({
  mongoURL: "mongodb://" + MONGODB_HOST,
  database: DB_NAME,
  collection: COLL_NAME
});

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
