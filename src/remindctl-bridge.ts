/**
 * Host-side TCP bridge for the remindctl MCP server.
 *
 * Listens on 127.0.0.1:REMINDCTL_PORT (loopback only). Each container connection
 * gets its own child remindctl-mcp.mjs process with stdio piped through the socket,
 * giving the container agent a fully functional MCP stdio server running on the
 * macOS host.
 *
 * TCP (not Unix socket) because Docker Desktop on macOS cannot route a Unix
 * socket through the Linux VM boundary — the file is visible via bind mount
 * but `connect()` from inside the container fails with ECONNREFUSED.
 * Containers reach this via `host.docker.internal:<port>`.
 *
 * Only started on darwin when `remindctl` is on PATH.
 */
import { createServer } from 'net';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

import { log } from './log.js';

export const REMINDCTL_PORT = 17249;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MCP_SCRIPT = path.join(__dirname, '..', 'scripts', 'remindctl-mcp.mjs');

export function startRemindctlBridge(): void {
  const server = createServer((socket) => {
    const child = spawn(process.execPath, [MCP_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    socket.pipe(child.stdin!);
    child.stdout!.pipe(socket);
    child.stderr!.on('data', (d: Buffer) => {
      log.debug('remindctl-mcp', { msg: d.toString().trim() });
    });
    child.on('error', (err) => {
      log.error('remindctl-mcp spawn failed', { err: String(err) });
      try {
        socket.destroy();
      } catch {}
    });

    const cleanup = () => {
      try {
        child.kill();
      } catch {}
      try {
        socket.destroy();
      } catch {}
    };
    socket.on('close', cleanup);
    socket.on('error', cleanup);
    child.on('exit', () => {
      try {
        socket.destroy();
      } catch {}
    });
  });

  server.listen(REMINDCTL_PORT, '127.0.0.1', () => {
    log.info('remindctl MCP bridge ready', { host: '127.0.0.1', port: REMINDCTL_PORT });
  });

  server.on('error', (err) => {
    log.error('remindctl bridge error', { err });
  });
}
