const path = require('path');

module.exports = {
  reporters: [ "default" ],
  testEnvironment: 'jest-environment-selenium',
  testEnvironmentOptions: {
    capabilities: {
      browserName: "chrome"
    },
    server: process.env.SELENIUM_URI || "http://localhost:4444/wd/hub",
    path: path.join(__dirname, "./"),
    params: {}
  },
  testRegex: "(/test/.*|(\\.|/)(test|spec))\\.js$",
  moduleFileExtensions: ["js", "jsx", "json", "node"]
};