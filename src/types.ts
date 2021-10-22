import { DatabasePoolType as BaseDatabasePoolType } from "slonik";

export type DatabasePoolType = BaseDatabasePoolType & {
  rollback: () => void;
};
