# Repository instructions

## User-authorized GitHub updates

The user explicitly requested on 16 October 2026 that completed changes already
made, and future completed changes to this project, be committed and pushed to
https://github.com/maxgoncalves97/ace-fisio.

- After completing a task and its relevant checks, commit the intended project
  changes and push to the existing `origin`. This authorization persists across
  sessions; do not ask for permission again merely to commit or push.
- The current working and Render deployment branch is
  `deploy/free-render-partner-demo`. Continue there unless the task requires a
  different branch. Do not force-push or merge into `main` without authorization.
- Keep database URLs, signing secrets, passwords, API keys, `.env` files, local
  tooling state and private test reports out of Git. Use the existing ignore
  rules and `backend/check_publish.py` to check staged files for local secrets.
- Preserve unrelated user work. If a push is blocked, keep the local commit and
  report the specific blocker; do not claim GitHub is updated until verified.
- Pushing code and deploying are separate actions. Render automatic deploys are
  off. This GitHub preference does not authorize paid resources or unrelated
  external actions. Keep the existing free hosting and database setup.
- Read `START_HERE.md` for the saved environment, testing commands and deployment
  workflow. Update the handoff when the setup materially changes.
