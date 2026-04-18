import { cleanupTestAccounts } from './support/testAccounts';

async function globalTeardown() {
  const summary = await cleanupTestAccounts();
  console.log('[playwright global teardown] test account cleanup', summary);
}

export default globalTeardown;