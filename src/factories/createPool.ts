import { Client as PgClient, Pool as PgPool } from "pg";
import { serializeError } from "serialize-error";
import { Logger } from "slonik/dist/Logger";
import type { ClientConfigurationInput } from "slonik/dist/types";
import { createUid } from "slonik/dist/utilities";
import { createClientConfiguration } from "slonik/dist/factories/createClientConfiguration";
import { createPoolConfiguration } from "slonik/dist/factories/createPoolConfiguration";
import { createTypeOverrides } from "slonik/dist/routines";
import { BindPoolMock } from "mocha-slonik/binders/bindPoolMock";
import type { DatabasePool } from "mocha-slonik/types";
import { poolStateMap } from "slonik/dist/state";

/**
 * @param connectionUri PostgreSQL [Connection URI](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING).
 */
export const createPool = async (
  connectionUri: string,
  clientConfigurationInput?: ClientConfigurationInput
): Promise<DatabasePool> => {
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

  // This pool is only used to initialize the client.
  const setupClient = new PgClient({
    database: poolConfiguration.database,
    host: poolConfiguration.host,
    password: poolConfiguration.password,
    port: poolConfiguration.port,
    ssl: poolConfiguration.ssl,
    user: poolConfiguration.user,
  });

  await setupClient.connect();

  const getTypeParser = await createTypeOverrides(setupClient, clientConfiguration.typeParsers);

  await setupClient.end();

  const pool: PgPool = new Pool({
    ...poolConfiguration,
    types: {
      getTypeParser,
    }
  });

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
