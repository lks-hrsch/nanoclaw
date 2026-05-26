import path from 'path';
import { initDb } from '/Users/lkshrsch/repos.nosync/github.com/qwibitai/nanoclaw/src/db/connection.js';
import { runMigrations } from '/Users/lkshrsch/repos.nosync/github.com/qwibitai/nanoclaw/src/db/migrations/index.js';
import { createAgentGroup, getAgentGroupByFolder } from '/Users/lkshrsch/repos.nosync/github.com/qwibitai/nanoclaw/src/db/agent-groups.js';
import { initGroupFilesystem } from '/Users/lkshrsch/repos.nosync/github.com/qwibitai/nanoclaw/src/group-init.js';
import { DATA_DIR } from '/Users/lkshrsch/repos.nosync/github.com/qwibitai/nanoclaw/src/config.js';

const db = initDb(path.join(DATA_DIR, 'v2.db'));
runMigrations(db);

const folder = 'ollama-local';
const name = 'gemma4-local';
let ag = getAgentGroupByFolder(folder);
if (!ag) {
  const id = `ag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  createAgentGroup({ id, name, folder, agent_provider: null, created_at: new Date().toISOString() });
  ag = getAgentGroupByFolder(folder)!;
  console.log(`Created agent group ${id} (${name}, folder=${folder})`);
} else {
  console.log(`Agent group already exists: ${ag.id}`);
}
initGroupFilesystem(ag);
console.log(`Filesystem scaffold ready at groups/${folder}/`);
console.log(`AGENT_GROUP_ID=${ag.id}`);
