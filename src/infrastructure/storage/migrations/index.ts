/**
 * Migrations Index
 * Exports all migrations in order
 */

export { migration001 } from './001-initial-schema';
export { migration002 } from './002-performance-indexes';
export { default as migration003 } from './003-add-commits-and-repo-metadata';
export { default as migration004 } from './004-add-parent-count-to-commits';
export { default as migration005 } from './005-add-body-to-pull-requests';
export { default as migration006 } from './006-add-merged-by-to-pull-requests';
export { default as migration007 } from './007-add-branch-names-to-pull-requests';
export { default as migration008 } from './008-add-requested-reviewers-to-pull-requests';
export { default as migration009 } from './009-add-commit-files-table';
export { default as migration010 } from './010-add-pr-commits';
export * from './Migration';

import { migration001 } from './001-initial-schema';
import { migration002 } from './002-performance-indexes';
import migration003 from './003-add-commits-and-repo-metadata';
import migration004 from './004-add-parent-count-to-commits';
import migration005 from './005-add-body-to-pull-requests';
import migration006 from './006-add-merged-by-to-pull-requests';
import migration007 from './007-add-branch-names-to-pull-requests';
import migration008 from './008-add-requested-reviewers-to-pull-requests';
import migration009 from './009-add-commit-files-table';
import migration010 from './010-add-pr-commits';

/**
 * All migrations in order
 */
export const ALL_MIGRATIONS = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
  migration009,
  migration010,
];
