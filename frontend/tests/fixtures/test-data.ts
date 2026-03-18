import { ADD_CONNECTION_API_REQUEST } from '../../src/api/data/connection';

const PW_SSH_PORT = Number(process.env.PW_SSH_PORT || 22222);

export const TEST_CONNECTION = {
  name: ADD_CONNECTION_API_REQUEST.name,
  // Prefer a stable local sshd container for integration tests.
  host: '127.0.0.1',
  port: PW_SSH_PORT,
  username: 'pwtest',
  auth_type: ADD_CONNECTION_API_REQUEST.auth_type as 'password' | 'privateKey',
  password: 'pwtest',
  private_key: ADD_CONNECTION_API_REQUEST.private_key,
  passphrase: ADD_CONNECTION_API_REQUEST.passphrase,
};

// Create a unique test user ID for testing
export const TEST_USER_ID = "test-user-" + Date.now();

// Commands to test in the terminal
export const TEST_COMMANDS = {
  echo: 'echo "playwright-test"',
  pwd: 'pwd',
  ls: 'ls -la',
};

// Expected outputs for verification
export const EXPECTED_OUTPUTS = {
  echo: 'playwright-test',
};
