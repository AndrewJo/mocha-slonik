import { RootHookObject } from "mocha";
import { Pool } from "pg";
import { ImportMock, OtherManager } from "ts-mock-imports";
import * as bindPool from "slonik/dist/src/binders/bindPool";
import type {
  ClientConfigurationType,
  DatabasePoolType,
  Logger,
} from "slonik/dist/src/types";
import { BindPoolMock } from "mocha-slonik/binders/bindPoolMock";

let bindPoolMock: BindPoolMock;
let bindPoolImportMock: OtherManager<
  (
    parentLog: Logger,
    pool: Pool,
    clientConfiguration: ClientConfigurationType
  ) => DatabasePoolType
>;

export const mochaHooks: RootHookObject = {
  beforeAll() {
    bindPoolMock = new BindPoolMock();
    bindPoolImportMock = ImportMock.mockOther(bindPool, "bindPool", bindPoolMock.bindPool());
  },
  afterEach() {
    bindPoolMock.rollback();
  },
  afterAll() {
    bindPoolImportMock.restore();
  },
};
