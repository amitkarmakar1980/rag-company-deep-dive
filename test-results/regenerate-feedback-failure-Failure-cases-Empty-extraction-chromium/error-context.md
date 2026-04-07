# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: regenerate-feedback-failure.spec.ts >> Failure cases >> Empty extraction
- Location: tests\regenerate-feedback-failure.spec.ts:45:3

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED ::1:3000
Call log:
  - → POST http://localhost:3000/api/deep-dive/extract-jd
    - user-agent: Playwright/1.59.1 (x64; windows 10.0) node/24.13
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - content-type: application/json
    - content-length: 35

```