// Import existing test data from the project
export const TEST_CONNECTION = {
  name: "我的mac",
  host: "192.168.31.132",
  port: 22,
  username: "apple",
  auth_type: "password" as const,
  password: "xuxin",
  private_key: "",
  passphrase: "",
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
