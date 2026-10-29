const request = require("supertest");

// CSRF protection (middleware/csrf.js) is mounted globally, so every POST/PATCH/DELETE needs the token
// plus the token cookie it was issued with. An agent keeps that cookie.
async function csrfAgent(app) {
  const agent = request.agent(app);
  const res = await agent.get("/api/auth/csrf-token");
  return { agent, csrfToken: res.body.csrfToken };
}

module.exports = { csrfAgent };
