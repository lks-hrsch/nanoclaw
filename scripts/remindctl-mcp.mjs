#!/usr/bin/env node
/**
 * MCP stdio server wrapping remindctl (Apple Reminders CLI).
 * Runs on the macOS host; the container connects via Unix socket bridge.
 */
import { execSync } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, terminal: false });

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function respond(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function respondError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

const TOOLS = [
  {
    name: 'reminders_show',
    description: 'Show Apple Reminders. Filter by time period, list name, or a specific date.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: "Time filter: today, tomorrow, week, overdue, upcoming, open, completed, all, or YYYY-MM-DD",
        },
        list: { type: 'string', description: 'Limit to a specific list name' },
      },
    },
  },
  {
    name: 'reminders_add',
    description: 'Add a new Apple Reminder.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Reminder title (required)' },
        list: { type: 'string', description: 'List name (default: Reminders)' },
        due: { type: 'string', description: 'Due date: today, tomorrow, YYYY-MM-DD, or "YYYY-MM-DD HH:mm"' },
        notes: { type: 'string', description: 'Notes / body text' },
        priority: { type: 'string', enum: ['none', 'low', 'medium', 'high'], description: 'Priority' },
        repeat: { type: 'string', description: 'Recurrence: daily, weekly, biweekly, monthly, yearly' },
      },
      required: ['title'],
    },
  },
  {
    name: 'reminders_edit',
    description: 'Edit an existing Apple Reminder by ID or index.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Reminder ID prefix or index (from reminders_show)' },
        title: { type: 'string', description: 'New title' },
        list: { type: 'string', description: 'Move to this list' },
        due: { type: 'string', description: 'New due date' },
        notes: { type: 'string', description: 'New notes' },
        priority: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
        clear_due: { type: 'boolean', description: 'Clear the due date' },
      },
      required: ['id'],
    },
  },
  {
    name: 'reminders_complete',
    description: 'Mark one or more Apple Reminders as complete.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Reminder IDs or indexes to complete (from reminders_show)',
        },
      },
      required: ['ids'],
    },
  },
  {
    name: 'reminders_delete',
    description: 'Delete an Apple Reminder.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Reminder ID or index to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'reminders_lists',
    description: 'List all Apple Reminder lists.',
    inputSchema: { type: 'object', properties: {} },
  },
];

function run(args) {
  try {
    const cmd = ['remindctl', ...args, '--json', '--no-input'].join(' ');
    return execSync(cmd, { encoding: 'utf8', timeout: 10000 });
  } catch (e) {
    const out = (e.stdout || '').trim();
    const err = (e.stderr || e.message || '').trim();
    return JSON.stringify({ error: out || err });
  }
}

function shellQuote(str) {
  return `'${str.replace(/'/g, "'\\''")}'`;
}

function callTool(name, input) {
  switch (name) {
    case 'reminders_show': {
      const args = ['show'];
      if (input.filter) args.push(input.filter);
      if (input.list) args.push('--list', shellQuote(input.list));
      return run(args);
    }
    case 'reminders_add': {
      const args = ['add', shellQuote(input.title)];
      if (input.list) args.push('--list', shellQuote(input.list));
      if (input.due) args.push('--due', shellQuote(input.due));
      if (input.notes) args.push('--notes', shellQuote(input.notes));
      if (input.priority) args.push('--priority', input.priority);
      if (input.repeat) args.push('--repeat', input.repeat);
      return run(args);
    }
    case 'reminders_edit': {
      const args = ['edit', input.id];
      if (input.title) args.push('--title', shellQuote(input.title));
      if (input.list) args.push('--list', shellQuote(input.list));
      if (input.due) args.push('--due', shellQuote(input.due));
      if (input.notes) args.push('--notes', shellQuote(input.notes));
      if (input.priority) args.push('--priority', input.priority);
      if (input.clear_due) args.push('--clear-due');
      return run(args);
    }
    case 'reminders_complete':
      return run(['complete', ...input.ids]);
    case 'reminders_delete':
      return run(['delete', input.id, '--force']);
    case 'reminders_lists':
      return run(['list']);
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

rl.on('line', (line) => {
  let msg;
  try { msg = JSON.parse(line.trim()); } catch { return; }

  const { id, method, params } = msg;

  if (method === 'initialize') {
    respond(id, {
      protocolVersion: '2024-11-05',
      serverInfo: { name: 'remindctl-mcp', version: '1.0.0' },
      capabilities: { tools: {} },
    });
  } else if (method === 'notifications/initialized' || method === 'initialized') {
    // no response
  } else if (method === 'tools/list') {
    respond(id, { tools: TOOLS });
  } else if (method === 'tools/call') {
    const output = callTool(params?.name, params?.arguments ?? {});
    respond(id, {
      content: [{ type: 'text', text: typeof output === 'string' ? output : JSON.stringify(output) }],
    });
  } else if (id !== undefined) {
    respondError(id, -32601, `Method not found: ${method}`);
  }
});
