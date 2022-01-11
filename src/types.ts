import type { Pool } from "pg";

import type {
  ClientConfiguration,
  Logger,
  DatabasePool as BaseDatabasePool,
  DatabaseTransactionConnection,
} from "slonik/dist/src/types";

export type DatabasePool = BaseDatabasePool & {
  get currentTransaction(): DatabaseTransactionConnection;
  rollback: () => void;
};

export type BindPoolFunction = (
  parentLog: Logger,
  pool: Pool,
  clientConfiguration: ClientConfiguration
) => DatabasePool;
