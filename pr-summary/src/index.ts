/* eslint-disable @typescript-eslint/no-floating-promises */
/**
 * The entrypoint for the action.
 */
import * as core from "@actions/core"
import { Circuit, Retry, RetryMode } from "mollitia"
import { config } from "./config.js"
import { run } from "./main.js"

const circuit = new Circuit({
  options: {
    modules: [
      new Retry({
        attempts: 3,
        interval: 5000,
        mode: RetryMode.EXPONENTIAL,
        onRejection: (error: Error, attempt) => {
          core.error(error)
          core.startGroup(`### Retry attempt ${attempt + 1}:`)
          core.info(`Previously encountered error was: ${error.message}`)
          return true // returning true will retry
        },
      }),
    ],
  },
})

if (process.env.NODE_ENV === "development") {
  run(config)
} else {
  circuit.fn(run).execute(config)
}
