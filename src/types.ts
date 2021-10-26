import type {
  ClientConfigurationType,
  InternalDatabasePoolType,
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
  pool: InternalDatabasePoolType,
  clientConfiguration: ClientConfigurationType
) => DatabasePoolType;
