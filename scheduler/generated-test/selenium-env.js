// selenium-environment
const webdriver = require("selenium-webdriver");
const NodeEnvironment = require("jest-environment-node");
const path = require("path");

class SeleniumEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config);
  }

  async setup() {
    await super.setup();

    const Runner = {};
    const drivers = [];
    Runner.configuration = {
      capabilities: {
        browserName: "chrome"
      },
      server: process.env.SELENIUM_URI || "http://localhost:4444/wd/hub",
      path: path.join(__dirname, "./")
    };

    Runner.buildDriver = function() {
      const driver = new webdriver.Builder().withCapabilities(
        Runner.configuration.capabilities
      );

      if (Runner.configuration.server)
        driver.usingServer(Runner.configuration.server);

      return driver.build();
    };

    Runner.getDriver = function() {
      const driver = Runner.buildDriver();
      drivers.push(driver);
      return driver;
    };

    Runner.releaseDriver = function(driver) {
      drivers.splice(drivers.indexOf(driver), 1);
      return driver.quit();
    };

    Runner.cleaup = function() {
      if (drivers.length) {
        return Promise.all(drivers.map(driver => driver.quit()));
      } else {
        return Promise.resolve();
      }
    };

    this.global.Runner = Runner;
  }

  async teardown() {
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = SeleniumEnvironment;
