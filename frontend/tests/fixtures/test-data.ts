import { ADD_CONNECTION_API_REQUEST } from '../../src/api/data/connection';

export const TEST_CONNECTION = {
  name: ADD_CONNECTION_API_REQUEST.name,
  host: ADD_CONNECTION_API_REQUEST.host,
  port: ADD_CONNECTION_API_REQUEST.port,
  username: ADD_CONNECTION_API_REQUEST.username,
  auth_type: ADD_CONNECTION_API_REQUEST.auth_type as 'password' | 'privateKey',
  password: ADD_CONNECTION_API_REQUEST.password,
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
