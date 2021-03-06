import { EventEmitter } from "events";
import { DatabaseTransactionConnection } from "slonik";
import { createConnection } from "slonik/dist/src/factories";
import { getPoolState } from "slonik/dist/src/state";
import type { Pool } from "pg";
import type {
  ClientConfiguration,
  Logger,
  PoolState,
  TaggedTemplateLiteralInvocation,
} from "slonik/dist/src/types";
import type { BindPoolFunction } from "mocha-slonik/types";

export class BindPoolMock extends EventEmitter {
  protected transaction: DatabaseTransactionConnection;

  protected getOrCreateTransaction(
    parentLog: Logger,
    pool: Pool,
    clientConfiguration: ClientConfiguration
  ): Promise<DatabaseTransactionConnection> {
    return new Promise(async (resolve, reject) => {
      // Re-use existing transaction.
      if (this.transaction) {
        return resolve(this.transaction);
      }

      const wrappedTransactionHandler = (transaction: DatabaseTransactionConnection) =>
        new Promise((_, innerReject) => {
          this.transaction = transaction;

          // Inner promise should be held pending until a rollback is triggered.
          this.once("rollback", () => {
            this.transaction = null;
            innerReject();
          });

          // Resolve the outer Promise with reference to the transaction.
          resolve(transaction);
        });

      try {
        await createConnection(
          parentLog,
          pool,
          clientConfiguration,
          "IMPLICIT_TRANSACTION",
          (_connectionLog, _connection, boundConnection) =>
            boundConnection.transaction(wrappedTransactionHandler),
          (newPool) => newPool.transaction(wrappedTransactionHandler)
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Rollback transaction. Should be used after each tests.
   */
  public rollback(): void {
    this.emit("rollback");
  }

  /**
   * Returns a mocked bindPool function that returns a DatabasePool object that wraps all methods
   * in a transaction.
   */
  public bindPool(): BindPoolFunction {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    return function (parentLog, pool, clientConfiguration) {
      function wrapTransaction(targetMethodName: string) {
        return async function (query: TaggedTemplateLiteralInvocation) {
          if (typeof query === "string") {
            throw new TypeError("Query must be constructed using `sql` tagged template literal.");
          }

          const transaction = await that.getOrCreateTransaction(
            parentLog,
            pool,
            clientConfiguration
          );
          return await transaction[targetMethodName](query);
        };
      }

      return {
        any: wrapTransaction("any"),
        anyFirst: wrapTransaction("anyFirst"),
        configuration: clientConfiguration,
        async connect<T>(connectionHandler): Promise<T> {
          const transaction = await that.getOrCreateTransaction(
            parentLog,
            pool,
            clientConfiguration
          );
          return connectionHandler(transaction);
        },
        async copyFromBinary(_copyQuery, _values, _columnTypes): Promise<Record<string, unknown>> {
          throw new Error("copyFromBinary is not supported in transactions.");
        },
        get currentTransaction() {
          return that.transaction;
        },
        async end() {
          const poolState = getPoolState(pool);
          const terminateIdleClients = () => {
            const activeConnectionCount = pool.totalCount - pool.idleCount;

            if (activeConnectionCount === 0) {
              for (const client of pool._clients) {
                pool._remove(client);
              }
            }
          };

          poolState.ended = true;

          return new Promise((resolve) => {
            terminateIdleClients();

            pool.on("remove", () => {
              if (pool.totalCount === 0) {
                resolve();
              }
            });

            if (pool.totalCount === 0) {
              resolve();
            }
          });
        },
        exists: wrapTransaction("exists"),
        getPoolState(): PoolState {
          const poolState = getPoolState(pool);
          return {
            activeConnectionCount: pool.totalCount - pool.idleCount,
            ended: poolState.ended,
            idleConnectionCount: pool.idleCount,
            waitingClientCount: pool.waitingCount,
          };
        },
        many: wrapTransaction("many"),
        manyFirst: wrapTransaction("manyFirst"),
        maybeOne: wrapTransaction("maybeOne"),
        maybeOneFirst: wrapTransaction("maybeOneFirst"),
        one: wrapTransaction("one"),
        oneFirst: wrapTransaction("oneFirst"),
        query: wrapTransaction("query"),
        rollback: that.rollback.bind(that),
        stream: wrapTransaction("stream"),
        async transaction(transactionHandler, transactionRetryLimit?: number) {
          const trx = await that.getOrCreateTransaction(parentLog, pool, clientConfiguration);
          return trx.transaction(transactionHandler, transactionRetryLimit);
        },
      };
    };
  }
}

export default BindPoolMock;
