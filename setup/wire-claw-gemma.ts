import path from 'path';
import { initDb } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrations/index.js';
import { createDestination, getDestinationByName } from '../src/modules/agent-to-agent/db/agent-destinations.js';
import { writeDestinations } from '../src/modules/agent-to-agent/write-destinations.js';
import { getSessionsByAgentGroup } from '../src/db/sessions.js';
import { DATA_DIR } from '../src/config.js';

const db = initDb(path.join(DATA_DIR, 'v2.db'));
runMigrations(db);

const CLAW = 'ag-1777923394316-5p4exl';
const GEMMA = 'ag-1777995626949-ukmip0';
const now = new Date().toISOString();

if (!getDestinationByName(CLAW, 'gemma')) {
  createDestination({
    agent_group_id: CLAW,
    local_name: 'gemma',
    target_type: 'agent',
    target_id: GEMMA,
    created_at: now,
  });
  console.log(`claw → gemma destination created`);
} else {
  console.log(`claw → gemma destination already exists`);
}

if (!getDestinationByName(GEMMA, 'claw')) {
  createDestination({
    agent_group_id: GEMMA,
    local_name: 'claw',
    target_type: 'agent',
    target_id: CLAW,
    created_at: now,
  });
  console.log(`gemma → claw destination created`);
} else {
  console.log(`gemma → claw destination already exists`);
}

// Project the new destination into claw's active session(s) so its running
// container can address gemma without a restart. (Per the invariant in
// db/agent-destinations.ts.) gemma has no active session yet, so its
// writeDestinations will run on first wake.
const sessions = getSessionsByAgentGroup(CLAW).filter((s) => s.status === 'active');
for (const s of sessions) {
  writeDestinations(CLAW, s.id);
  console.log(`Refreshed destinations projection for claw session ${s.id}`);
}
