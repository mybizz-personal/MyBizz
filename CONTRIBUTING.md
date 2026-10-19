# Contributing to MyBizz

1. Fork the repository and create your branch from `main`.
2. Ensure you have Node.js and npm installed.
3. Run `npm install` from the root of the monorepo.
4. If you've added code that should be tested, add tests.
5. Ensure the test suite passes and `npm run build` succeeds.
6. Issue a Pull Request.

## Monorepo Architecture

This project uses npm workspaces to manage the `apps/web` application and potentially future `packages` (like ui, types). 
Make sure your changes run successfully in the Vite build process.
