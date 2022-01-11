import type { Pool } from "pg";

import type {
  ClientConfigurationType,
  Logger,
  DatabasePoolType as BaseDatabasePoolType,
  DatabaseTransactionConnectionType,
} from "slonik/dist/src/types";

export type DatabasePoolType = BaseDatabasePoolType & {
  get currentTransaction(): DatabaseTransactionConnectionType;
  rollback: () => void;
};

export type BindPoolFunction = (
  parentLog: Logger,
  pool: Pool,
  clientConfiguration: ClientConfigurationType
) => DatabasePoolType;
