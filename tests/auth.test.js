import test from "node:test";
import assert from "node:assert/strict";
import app from "../backend/server.js";

const server = app.listen(0);
const baseUrl = `http://127.0.0.1:${server.address().port}`;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options
  });
  return { response, body: await response.json() };
}

test("login returns access and refresh tokens", async () => {
  const { response, body } = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "demo@example.com", password: "demo-password" })
  });

  assert.equal(response.status, 200);
  assert.ok(body.accessToken);
  assert.ok(body.refreshToken);
});

test("protected route accepts a valid access token", async () => {
  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "demo@example.com", password: "demo-password" })
  });

  const result = await request("/auth/me", {
    headers: { authorization: `Bearer ${login.body.accessToken}` }
  });

  assert.equal(result.response.status, 200);
  assert.equal(result.body.user.email, "demo@example.com");
});

test.after(() => server.close());
