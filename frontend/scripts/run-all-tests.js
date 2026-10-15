// globalSetup runs backend checks after Playwright has started the isolated API.
process.env.E2E_BACKEND_CHECKS = '1';
require('./run-e2e');
