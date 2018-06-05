import Agenda = require("agenda");
import express = require("express");
import { Application } from "express";
import { MongoClient } from "mongodb";

import { buildConvertRouter, buildJobRouter, buildSideRouter } from "./router";

import {
  initialize as initWatcher,
  terminate as closeWatcher
} from "./libs/testWatcher";

const MONGODB_CONN_SCHEME = process.env.MONGODB_CONN_SCHEME || "mongodb";
const MONGODB_USER = process.env.MONGODB_USER || "";
const MONGODB_PASSWD = process.env.MONGODB_PASSWD || "";
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
    initWatcher();

    client = await MongoClient.connect(settings.mongoURL);
    const db = client.db(settings.database);

    agenda.mongo(db, settings.collection).name("BDD Scheduler Queue");

    const app: Application = express();
    const port: number = Number(process.env.PORT) || 3000;
    app.use("/jobs", buildJobRouter(agenda, db, settings.collection));
    app.use("/convert", buildConvertRouter());
    app.use("/side", buildSideRouter());
    app.listen(port);
  } catch (e) {
    console.error(e);
  }
}
const authUrl =
  MONGODB_USER === ""
    ? ""
    : `${encodeURIComponent(MONGODB_USER)}:${encodeURIComponent(
        MONGODB_PASSWD
      )}@`;

const mongoURL = `${MONGODB_CONN_SCHEME}://${authUrl}${MONGODB_HOST}`;
console.log("Connecting to %s", mongoURL);

load({
  mongoURL,
  database: DB_NAME,
  collection: COLL_NAME
});

agenda.on("ready", () => {
  agenda.start();
});

function graceful() {
  agenda.stop(() => {
    process.exit(0);
    closeWatcher();
    if (client) {
      client.close();
    }
  });
}

process.on("SIGTERM", graceful);
process.on("SIGINT", graceful);
