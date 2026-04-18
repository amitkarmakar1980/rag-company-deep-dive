import { cleanupTestAccounts } from './support/testAccounts';

async function globalSetup() {
  const summary = await cleanupTestAccounts();
  console.log('[playwright global setup] test account cleanup', summary);
}

export default globalSetup;