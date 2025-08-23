import { createApp } from './app.js';
import { config } from './config.js';

createApp().listen(config.port, () => {
  console.log(`BugBoard API listening on http://localhost:${config.port}`);
  if (config.testEndpointsEnabled) {
    console.log('Test endpoints are enabled: POST /api/test/reset restores the seed data.');
  }
});
