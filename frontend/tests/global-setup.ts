import type { FullConfig } from '@playwright/test';
import { execSync } from 'node:child_process';

const CONTAINER_NAME = process.env.PW_SSH_CONTAINER_NAME || 'remote-terminal-pw-sshd';
const HOST_PORT = Number(process.env.PW_SSH_PORT || 22222);

function sh(cmd: string) {
  execSync(cmd, { stdio: 'inherit' });
}

export default async function globalSetup(_config: FullConfig) {
  // Best-effort cleanup if it already exists
  try {
    sh(`sh -lc "docker rm -f ${CONTAINER_NAME} >/dev/null 2>&1 || true"`);
  } catch {
    // ignore
  }

  // A minimal SSH server with a known test user/password.
  sh(
    [
      `docker run -d --name ${CONTAINER_NAME}`,
      // linuxserver/openssh-server listens on 2222 inside container by default
      `-p ${HOST_PORT}:2222`,
      '-e PUID=1000 -e PGID=1000 -e TZ=UTC',
      '-e PASSWORD_ACCESS=true',
      '-e USER_NAME=pwtest',
      '-e USER_PASSWORD=pwtest',
      '-e SUDO_ACCESS=false',
      'linuxserver/openssh-server:latest',
    ].join(' ')
  );

  // Wait until host port is reachable
  sh(
    `sh -lc 'for i in $(seq 1 60); do nc -z 127.0.0.1 ${HOST_PORT} >/dev/null 2>&1 && exit 0; sleep 1; done; echo "sshd port not reachable on ${HOST_PORT}"; docker logs ${CONTAINER_NAME}; exit 1'`
  );
}

