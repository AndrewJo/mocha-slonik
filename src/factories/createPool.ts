import { Pool as PgPool } from "pg";
import { serializeError } from "serialize-error";
import { Logger } from "slonik/dist/src/Logger";
import type { ClientConfigurationInputType } from "slonik/dist/src/types";
import { createUid } from "slonik/dist/src/utilities";
import { createClientConfiguration } from "slonik/dist/src/factories/createClientConfiguration";
import { createPoolConfiguration } from "slonik/dist/src/factories/createPoolConfiguration";
import { BindPoolMock } from "mocha-slonik/binders/bindPoolMock";
import type { DatabasePoolType } from "mocha-slonik/types";
import { poolStateMap } from "slonik/dist/src/state";

/**
 * @param connectionUri PostgreSQL [Connection URI](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING).
 */
export const createPool = (
  connectionUri: string,
  clientConfigurationInput?: ClientConfigurationInputType
): DatabasePoolType => {
  const clientConfiguration = createClientConfiguration(clientConfigurationInput);

  const poolId = createUid();

  const poolLog = Logger.child({
    poolId,
  });

  const poolConfiguration = createPoolConfiguration(connectionUri, clientConfiguration);

  let Pool = clientConfiguration.PgPool;

  if (!Pool) {
    Pool = PgPool;
  }

  if (!Pool) {
    throw new Error("Unexpected state.");
  }

  const pool: PgPool = new Pool(poolConfiguration);

  poolStateMap.set(pool, {
    ended: false,
    mock: false,
    poolId,
    typeOverrides: null,
  });

  // istanbul ignore next
  // pool.on("error", (error) => {
  //   if (!error.client.connection.slonik.terminated) {
  //     poolLog.error(
  //       {
  //         error: serializeError(error),
  //       },
  //       "client connection error"
  //     );
  //   }
  // });

  // istanbul ignore next
  pool.on("connect", (client) => {
    client.on("error", (error) => {
      // if (
      //   error.message.includes("Connection terminated unexpectedly") ||
      //   error.message.includes("server closed the connection unexpectedly")
      // ) {
      //   client.connection.slonik.terminated = error;
      // }

      poolLog.error({ error: serializeError(error) }, "client error");
    });

    client.on("notice", (notice) => {
      poolLog.info(
        {
          notice: {
            level: notice.name,
            message: notice.message,
          },
        },
        "notice message"
      );
    });

    poolLog.debug(
      {
        processId: client.processID,
        stats: {
          idleConnectionCount: pool.idleCount,
          totalConnectionCount: pool.totalCount,
          waitingRequestCount: pool.waitingCount,
        },
      },
      "created a new client connection"
    );
  });

  // istanbul ignore next
  pool.on("acquire", (client) => {
    poolLog.debug(
      {
        processId: client.processID,
        stats: {
          idleConnectionCount: pool.idleCount,
          totalConnectionCount: pool.totalCount,
          waitingRequestCount: pool.waitingCount,
        },
      },
      "client is checked out from the pool"
    );
  });

  // istanbul ignore next
  pool.on("remove", (client) => {
    poolLog.debug(
      {
        processId: client.processID,
        stats: {
          idleConnectionCount: pool.idleCount,
          totalConnectionCount: pool.totalCount,
          waitingRequestCount: pool.waitingCount,
        },
      },
      "client connection is closed and removed from the client pool"
    );
  });

  const bindPool = new BindPoolMock().bindPool();

  return bindPool(poolLog, pool, clientConfiguration);
};
