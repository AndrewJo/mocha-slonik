import type {
  ClientConfigurationType,
  InternalDatabasePoolType,
  Logger,
  DatabasePoolType as BaseDatabasePoolType,
} from "slonik/dist/src/types"

export type DatabasePoolType = BaseDatabasePoolType & {
  rollback: () => void;
};

export type BindPoolFunction = (
  parentLog: Logger,
  pool: InternalDatabasePoolType,
  clientConfiguration: ClientConfigurationType
) => DatabasePoolType;
