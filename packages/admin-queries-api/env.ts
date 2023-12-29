import type { Infer } from "superstruct"
import type {} from "aws-lambda"
import { create, coerce, type, string, array, optional } from "superstruct"

export const ProcessEnv = type({
  COGNITO_USER_POOL_ID: string(),
  ALLOWED_GROUPS: coerce(array(string()), string(), (value) =>
    JSON.parse(value),
  ),
  ACCESS_CONTROL_ALLOW_ORIGINS: optional(
    coerce(array(string()), string(), (value) => JSON.parse(value)),
  ),
})

// error early if env vars are not set
export const env = create(
  process.env,
  ProcessEnv,
  "Unable to validate expected environment variables",
)

declare global {
  namespace NodeJS {
    /**
     * @see https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime
     */
    interface ProcessEnv extends Infer<typeof ProcessEnv> {
      /**
       * AWS Region where the Lambda is running
       */
      AWS_REGION: string
      /**
       * AWS Access Key ID
       */
      AWS_ACCESS_KEY_ID: string
      /**
       * AWS Secret Access Key
       */
      AWS_SECRET_ACCESS_KEY: string
      /**
       * AWS Session token
       */
      AWS_SESSION_TOKEN: string
      /**
       * ... and a lot of others that aren't super important
       */
    }
  }
}
