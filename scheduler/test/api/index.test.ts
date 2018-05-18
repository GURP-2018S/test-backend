import axios from "axios";

import { JobOverview, JobId, JobCreation } from "../../src/jobs";
import { JobDetail, IRadishOptions } from "../../src/jobs/radish";
import { ObjectId } from "bson";
// 나중에 테스트 프레임워크로 환경변수 설정하면 이쁘게 될 듯?
// 지금은 그냥 할래 :))
const host = process.env.TEST_HOST || "localhost:3000";
const url = `http://${host}`;

/* Job List를 가져옴
* Feature List를 반환함!*/
async function getJobList() {
  const response = await axios.get<JobOverview[]>(url + "/jobs");
  return response.data;
}

// Job Detail을 가져옴
async function getJobDetail(id: JobId) {
  const response = await axios.get<JobDetail>(`${url}/jobs/${id}`);
  return response.data;
}

async function addJob(scheduleData: JobCreation<IRadishOptions>) {
  const response = await axios.post(url + "/jobs", scheduleData);
  return response.data;
}

/* 작업이 실제로 추가되었는지 확인한다.
* 추가하기 전 마지막 작업의 id와 추가한 뒤 마지막 작업의 id를 비교한다.
* 기본적으로 old 순으로 나오는 것을 가정한다 */
export async function addJobTest() {
  expect.assertions(4);
  const oldJobList = (await getJobList());
  const oldJobId = oldJobList[oldJobList.length - 1].id;
  expect(typeof oldJobId).toBe('string');

  const result = await addJob({ processor: "radish", options: { feature: "." } });
  expect(result.message).toBe('success');
  // expect(result.id).toBeInstanceOf(ObjectId);
  const addJobId = result.id;

  const jobList = await getJobList();
  const lastJob = jobList[jobList.length - 1];

  // Should be the same with the last one in the list
  expect(lastJob.id).toBe(addJobId);
  // Must differ from the first one
  expect(lastJob.id).not.toBe(oldJobId);

}

test("addJobTest", addJobTest);
