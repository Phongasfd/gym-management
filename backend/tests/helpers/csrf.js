const request = require("supertest");

// csurf is mounted globally, so every POST/PATCH/DELETE needs the token
// plus the _csrf secret cookie it was issued with. An agent keeps that cookie.
async function csrfAgent(app) {
  const agent = request.agent(app);
  const res = await agent.get("/api/auth/csrf-token");
  return { agent, csrfToken: res.body.csrfToken };
}

module.exports = { csrfAgent };
