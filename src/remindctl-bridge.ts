/**
 * Host-side Unix socket bridge for the remindctl MCP server.
 *
 * Listens on SOCKET_PATH. Each container connection gets its own child
 * remindctl-mcp.mjs process with stdio piped through the socket, giving the
 * container agent a fully functional MCP stdio server running on the macOS host.
 *
 * Only started on darwin when `remindctl` is on PATH.
 */
import { createServer } from 'net';
import { spawn } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

import { log } from './log.js';

export const REMINDCTL_SOCKET = '/tmp/nanoclaw-remindctl.sock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MCP_SCRIPT = path.join(__dirname, '..', 'scripts', 'remindctl-mcp.mjs');

export function startRemindctlBridge(): void {
  if (existsSync(REMINDCTL_SOCKET)) {
    try { unlinkSync(REMINDCTL_SOCKET); } catch {}
  }

  const server = createServer((socket) => {
    const child = spawn('node', [MCP_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    socket.pipe(child.stdin!);
    child.stdout!.pipe(socket);
    child.stderr!.on('data', (d: Buffer) => {
      log.debug('remindctl-mcp', { msg: d.toString().trim() });
    });

    const cleanup = () => {
      try { child.kill(); } catch {}
      try { socket.destroy(); } catch {}
    };
    socket.on('close', cleanup);
    socket.on('error', cleanup);
    child.on('exit', () => { try { socket.destroy(); } catch {} });
  });

  server.listen(REMINDCTL_SOCKET, () => {
    log.info('remindctl MCP bridge ready', { socket: REMINDCTL_SOCKET });
  });

  server.on('error', (err) => {
    log.error('remindctl bridge error', { err });
  });
}
