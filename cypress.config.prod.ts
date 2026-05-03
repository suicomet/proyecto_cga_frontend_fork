import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'https://proyectocga-production-2e12.up.railway.app',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/suite-produccion/**/*.cy.ts',
    video: true,
    screenshotOnRunFailure: true,
    reporter: 'mochawesome',
    reporterOptions: {
      reportDir: 'cypress/reports-prod',
      html: true,
      json: true,
    },
  },
});
