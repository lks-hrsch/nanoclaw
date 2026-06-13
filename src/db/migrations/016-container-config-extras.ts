import type { Migration } from './index.js';

export const migration016ContainerConfigExtras: Migration = {
  version: 16,
  name: '016-container-config-extras',
  up(db) {
    db.exec(`
      ALTER TABLE container_configs ADD COLUMN env          TEXT NOT NULL DEFAULT '{}';
      ALTER TABLE container_configs ADD COLUMN blocked_hosts TEXT NOT NULL DEFAULT '[]';
    `);
  },
};
