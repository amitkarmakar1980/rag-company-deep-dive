# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: jd-and-dive.spec.ts >> JD Extraction >> Extract JD from greenhouse page
- Location: tests\jd-and-dive.spec.ts:6:5

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED ::1:3000
Call log:
  - → POST http://localhost:3000/api/deep-dive/extract-jd
    - user-agent: Playwright/1.59.1 (x64; windows 10.0) node/24.13
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - content-type: application/json
    - content-length: 55

```