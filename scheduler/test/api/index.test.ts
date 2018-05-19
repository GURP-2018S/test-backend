import axios from "axios";

import { JobOverview, JobCreation } from "../../src/jobs";
import { JobDetail, IRadishOptions } from "../../src/jobs/radish";
// 나중에 테스트 프레임워크로 환경변수 설정하면 이쁘게 될 듯?
// 지금은 그냥 할래 :))
const host = process.env.TEST_HOST || "localhost:3000";
const url = `http://${host}`;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* Job List를 가져옴
* Feature List를 반환함!*/
async function getJobList() {
  const response = await axios.get<JobOverview[]>(url + "/jobs");
  return response.data;
}

// Job Detail을 가져옴
async function getJobDetail(id: string) {
  const response = await axios.get<JobDetail>(`${url}/jobs/${id}`);
  return response.data;
}

async function addJob(scheduleData: JobCreation<IRadishOptions>) {
  const response = await axios.post(url + "/jobs", scheduleData);
  return response.data;
}

/* 작업이 실제로 추가되었는지 확인한다.
 * 추가하기 전 최근 작업의 id와, 추가한 후에 최근 작업의 id를 비교한다.
 * 기본적으로 최근에 추가된 순으로 나오는 것을 가정한다. */
async function addJobTest() {
  expect.assertions(5);

  const oldJobList = await getJobList();
  const oldJobId = oldJobList[0].id;
  expect(typeof oldJobId).toBe("string");

  const result = await addJob({
    processor: "radish",
    options: { feature: "." }
  });
  expect(result.message).toBe("success");
  // expect(result.id).toBeInstanceOf(ObjectId);
  const addJobId = result.id;

  const jobList = await getJobList();
  const latestJobId = jobList[0].id;

  expect(typeof latestJobId).toBe("string");
  // Should be the same with the last one in the list
  expect(latestJobId).toBe(addJobId);
  // Must differ from the first one
  expect(latestJobId).not.toBe(oldJobId);
}

/* 실패하는 작업 하나를 실행한 뒤 해당 작업을 조회해 상태를 확인한다 */
async function getJobTest() {
  expect.assertions(2);
  const result = await addJob({
    processor: "radish",
    options: { feature: "fail.feature" }
  });
  /* Job successfully created */
  expect(result.message).toBe("success");
  let jobDetail: JobDetail | undefined;
  while (
    (jobDetail = await getJobDetail(result.id)) &&
    jobDetail.state !== "finished"
  ) {
    await sleep(300);
  }
  /* The job must fail */
  expect(jobDetail.success).toBe(false);
}

test(
  "Test adding a job and the order of list if the latest comes first",
  addJobTest
);
test("Test adding a faulty job and check it has failed", getJobTest);
