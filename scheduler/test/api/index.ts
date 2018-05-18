import axios from "axios";

import { JobOverview, JobId } from "../../src/jobs";
import { JobDetail } from "../../src/jobs/radish";
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

interface ISchedule {
  when?: string; // If not exists, the job is scheduled right now
}

async function addJob(scheduleData?: ISchedule) {
  const response = await axios.post(
    url + "/jobs/processor/radish",
    scheduleData
  );
  return response.status === 200;
}

/* 작업이 실제로 추가되었는지 확인한다.
* 추가하기 전 마지막 작업의 id와 추가한 뒤 마지막 작업의 id를 비교한다. */
export function AddJobTest() {
  let lastJobId: string | undefined;
  getJobList()
    .then(jobList => {
      lastJobId = jobList[jobList.length - 1]._id.toHexString();
      return addJob();
    })
    .then(success => {
      if (!success) {
        throw new Error("Failed to add a new job");
      }
      return getJobList();
    })
    .then(jobList => {
      if (lastJobId !== jobList[jobList.length - 1]._id.toHexString()) {
        throw new Error("Failed to compare job id from before");
      }
      return true;
    })
    .catch(err => {
      console.error(err);
    })
    .then(() => {
      console.log("success!");
    });
}
