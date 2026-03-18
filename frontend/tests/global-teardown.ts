import type { FullConfig } from '@playwright/test';
import { execSync } from 'node:child_process';

const CONTAINER_NAME = process.env.PW_SSH_CONTAINER_NAME || 'remote-terminal-pw-sshd';

export default async function globalTeardown(_config: FullConfig) {
  try {
    execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'inherit' });
  } catch {
    // ignore
  }
}

