# Authentication Flow

## 1. Login

The client sends credentials to `POST /auth/login` over HTTPS. The server validates the user and returns an access token plus a refresh token.

```text
Browser
  │
  │ POST /auth/login { email, password }
  ▼
Auth route
  │
  ├── find user
  ├── verify credentials
  └── issue tokens
       │
       ├── access token (short-lived)
       └── refresh token (longer-lived)
```

## 2. Calling a protected API

The client sends the access token in the `Authorization` header:

```text
Authorization: Bearer <access-token>
```

The authentication middleware verifies the signature, token type, expiration, and user identity before allowing the request through.

## 3. Refreshing

When an access token expires, the client sends the refresh token to `POST /auth/refresh`. The server verifies it and issues a new access token and refresh token.

For production systems, persist refresh-token state server-side and rotate/revoke refresh tokens so stolen refresh tokens can be detected and invalidated.

## 4. Credentials and secrets

- User passwords must be stored as strong password hashes, never plaintext.
- JWT signing secrets must come from environment variables or a dedicated secrets manager.
- Never commit `.env` or tokens to Git.
- Prefer secure, HttpOnly, SameSite cookies for browser session/refresh credentials when appropriate.
- Use HTTPS in production.
- Add rate limiting, CSRF defenses where cookie authentication is used, account lockout/abuse controls, audit logging, and appropriate token revocation.

## 5. Request/response responsibility

| Component | Responsibility |
|---|---|
| `frontend/login.js` | Sends login credentials and receives tokens |
| `frontend/api.js` | Sends bearer token and refresh requests |
| `backend/routes/auth.js` | Login, refresh, and current-user endpoints |
| `backend/middleware/authenticate.js` | Validates access tokens |
| `backend/services/tokenService.js` | Signs and verifies JWTs |
| `backend/models/user.js` | Demo user lookup |
| `tests/auth.test.js` | Verifies core authentication behavior |
