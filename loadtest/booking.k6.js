// k6 load test: many members booking the same class at once, through the real HTTP API.
//
// Needs a running backend (RATE_LIMIT_DISABLED=true so one load-generator IP is not throttled)
// and member access tokens. Generate them with the backend's JWT_SECRET, e.g.:
//
//   cd backend && npx tsx -e "const jwt=require('jsonwebtoken');const ids=process.argv.slice(1);console.log(JSON.stringify(ids.map(id=>jwt.sign({userType:'member',userId:id},process.env.JWT_SECRET))))" <member ids...> > ../loadtest/tokens.json
//
// then:  k6 run -e BASE_URL=http://localhost:3000 -e CLASS_ID=<class uuid> loadtest/booking.k6.js
//
// scripts/load-http.ts does the same without k6 (and creates the data itself).
import http from 'k6/http';
import exec from 'k6/execution';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const CLASS_ID = __ENV.CLASS_ID;
const tokens = new SharedArray('tokens', () => JSON.parse(open('./tokens.json')));

const booked = new Counter('booked');
const full = new Counter('class_full');

export const options = {
  scenarios: {
    rush: { executor: 'shared-iterations', vus: 50, iterations: tokens.length, maxDuration: '1m' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // 409 "full" is expected and not counted as failed below
    'http_req_duration{expected_response:true}': ['p(95)<500'],
  },
};

export function setup() {
  const res = http.get(`${BASE}/api/auth/csrf-token`);
  const cookie = res.headers['Set-Cookie'].split(';')[0];
  return { csrfToken: res.json('csrfToken'), cookie };
}

http.setResponseCallback(http.expectedStatuses(201, 409));

export default function (data) {
  // shared-iterations: iterationInTest is unique across all VUs, so each member books once
  const token = tokens[exec.scenario.iterationInTest];
  const res = http.post(`${BASE}/api/bookings`, JSON.stringify({ class_id: CLASS_ID }), {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': data.csrfToken,
      Cookie: `${data.cookie}; access_token=${token}`,
    },
  });
  check(res, { 'booked or full': (r) => r.status === 201 || r.status === 409 });
  if (res.status === 201) booked.add(1);
  if (res.status === 409) full.add(1);
}
