// This file was generated using Selenium IDE
const By = require('selenium-webdriver').By;
const until = require('selenium-webdriver').until;
jest.setTimeout(30000);
afterAll(() => {
  Runner.cleaup();
});
const BASE_URL = 'https://www.naver.com';
describe("Default Suite", () => {
  it("Hello Adele", () => {
    const driver = Runner.getDriver();
    return driver.then(async () => {
      // command_id : c2748df3-b52f-422b-9285-67540912a008
      await driver.get(BASE_URL + "/");
      // command_id : 037c76be-c337-4041-8aae-ef8c6e0935b1
      await driver.wait(until.elementLocated(By.id("query")));
      await driver.findElement(By.id("query")).then(element =>
        element.clear().then(() =>
          element.sendKeys("Hello Adele")
        )
      );
      // command_id : c8902d3f-9033-4c9d-b7e7-df57c7624a93
      await driver.wait(until.elementLocated(By.id("sform")));
      await driver.findElement(By.id("sform")).then(element =>
        element.submit()
      );
      // command_id : eaadad0a-d177-4196-8f41-703b086da22d
      await driver.wait(until.elementLocated(By.css("#main_pack > div.music.music_type.section > div.section_head > h2")));
      await driver.findElement(By.css("#main_pack > div.music.music_type.section > div.section_head > h2")).then(element =>
        element.getText().then(text =>
          expect(text).toBe(`네이버 뮤직`)
        )
      );
      return driver.getTitle().then(title => {
        expect(title).toBeDefined();
        Runner.releaseDriver(driver);
      });
    }).catch((e) => (Runner.releaseDriver(driver).then(() => {
      throw e;
    })));
  });
});