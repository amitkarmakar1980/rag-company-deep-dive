import { cleanupTestAccounts } from './support/testAccounts';

cleanupTestAccounts()
  .then((summary) => {
    console.log('[manual test-account cleanup]', summary);
  })
  .catch((error) => {
    console.error('[manual test-account cleanup] failed', error);
    process.exitCode = 1;
  });