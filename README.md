# Auth Flow Reference

A practical reference implementation showing a secure login and API authentication flow.

## Project goals

- Explain the end-to-end authentication request flow.
- Keep credentials and tokens out of source control.
- Demonstrate short-lived access tokens and refresh-token rotation.
- Separate authentication routes, middleware, token handling, and user persistence.
- Include tests and documentation.

## Structure

```text
auth-flow-reference/
├── README.md
├── .env.example
├── .gitignore
├── package.json
├── frontend/
│   ├── login.js
│   └── api.js
├── backend/
│   ├── server.js
│   ├── routes/
│   │   └── auth.js
│   ├── middleware/
│   │   └── authenticate.js
│   ├── services/
│   │   └── tokenService.js
│   └── models/
│       └── user.js
├── tests/
│   └── auth.test.js
└── docs/
    └── authentication-flow.md
```

## Security notes

Never commit passwords, API keys, personal access tokens, refresh tokens, private keys, or production environment files. Use environment variables or a secrets manager for credentials.

This repository is intentionally educational: adapt the storage, session policy, CSRF protection, rate limiting, logging, and deployment configuration to the application's threat model before production use.
