import type { Struct } from "superstruct"
import type { MiddlewareHandler } from "hono"
import type { LambdaEvent, LambdaContext } from "hono/aws-lambda"
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminConfirmSignUpCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
  AdminUserGlobalSignOutCommand,
  ListGroupsCommand,
  ListUsersCommand,
  ListUsersInGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider"
import { Hono } from "hono"
import { env } from "./env"
import { validator } from "hono/validator"
import { is, object, string } from "superstruct"

// https://hono.dev/getting-started/aws-lambda#access-aws-lambda-object
type Bindings = {
  event: LambdaEvent
  context: LambdaContext
}

export const app = new Hono<{ Bindings: Bindings }>()

const cognito = new CognitoIdentityProviderClient()

/**
 * Body validator with superstruct
 */
function validate<T, S>(struct: Struct<T, S>) {
  return validator("form", (value, c) => {
    if (!is(value, struct)) {
      return c.text("Invalid body", 400)
    }
    return value
  })
}

/**
 * middleware to verify caller's Cognito User Pool Group
 * @param name Cognito User Pool Group name
 */
function group(name: string): MiddlewareHandler<{ Bindings: Bindings }> {
  return async function (c, next) {
    // check if request context is ApiGatewayProxyEventV2
    console.log(
      "event request context",
      JSON.stringify(c.env.event.requestContext),
    )
    if (c.env.event.requestContext) {
      // const claims = c.env.event.requestContext.authorizer.claims
      // const groups = claims['cognito:group']
    }
    next()
  }
}

// middleware to check Cognito user group
app.use("*", group("ADMINS"))
app.use("*", async (c, next) => {
  const start = Date.now()
  await next()
  const end = Date.now()
  c.res.headers.set("X-Response-Time", `${end - start}`)
})

app.post(
  "/add-user-to-group",
  validate(
    object({
      username: string(),
      group: string(),
    }),
  ),
  async (c) => {
    const form = c.req.valid("form")
    const command = new AdminAddUserToGroupCommand({
      GroupName: form.group,
      Username: form.username,
      UserPoolId: env.COGNITO_USER_POOLS_ID,
    })
    const response = await cognito.send(command)
    return c.status(200)
  },
)

app.post(
  "/remove-user-from-group",
  validate(
    object({
      username: string(),
      group: string(),
    }),
  ),
  async (c) => {
    const form = c.req.valid("form")
    const command = new AdminRemoveUserFromGroupCommand({
      GroupName: form.group,
      Username: form.username,
      UserPoolId: env.COGNITO_USER_POOLS_ID,
    })
    const response = await cognito.send(command)
    return c.status(200)
  },
)

app.post(
  "/confirm-user-signup",
  validate(
    object({
      username: string(),
    }),
  ),
  async (c) => {
    const form = c.req.valid("form")
    const command = new AdminConfirmSignUpCommand({
      Username: form.username,
      UserPoolId: env.COGNITO_USER_POOLS_ID,
    })
    const response = await cognito.send(command)
    return c.status(200)
  },
)

app.post(
  "/disable-user",
  validate(
    object({
      username: string(),
    }),
  ),
  async (c) => {
    const form = c.req.valid("form")
    const command = new AdminDisableUserCommand({
      Username: form.username,
      UserPoolId: env.COGNITO_USER_POOLS_ID,
    })
    const response = await cognito.send(command)
    return c.status(200)
  },
)

app.post(
  "/enable-user",
  validate(
    object({
      username: string(),
    }),
  ),
  async (c) => {
    const form = c.req.valid("form")
    const command = new AdminEnableUserCommand({
      Username: form.username,
      UserPoolId: env.COGNITO_USER_POOLS_ID,
    })
    const response = await cognito.send(command)
    return c.status(200)
  },
)

app.get(
  "/get-user",
  validate(
    object({
      username: string(),
    }),
  ),
  async (c) => {
    const form = c.req.valid("form")
    const command = new AdminGetUserCommand({
      Username: form.username,
      UserPoolId: env.COGNITO_USER_POOLS_ID,
    })
    const response = await cognito.send(command)
    return c.json(response)
  },
)

app.get("/list-users", async (c) => {
  const command = new ListUsersCommand({
    UserPoolId: env.COGNITO_USER_POOLS_ID,
  })
  const response = await cognito.send(command)
  return c.json(response)
})

app.get("/list-groups", async (c) => {
  const command = new ListGroupsCommand({
    UserPoolId: env.COGNITO_USER_POOLS_ID,
  })
  const response = await cognito.send(command)
  return c.json(response)
})

app.get(
  "/list-groups-for-user",
  validate(
    object({
      username: string(),
    }),
  ),
  async (c) => {
    const form = c.req.valid("form")
    const command = new AdminListGroupsForUserCommand({
      Username: form.username,
      UserPoolId: env.COGNITO_USER_POOLS_ID,
    })
    const response = await cognito.send(command)
    return c.json(response)
  },
)

app.get(
  "/list-users-in-group",
  validate(
    object({
      group: string(),
    }),
  ),
  async (c) => {
    const form = c.req.valid("form")
    const command = new ListUsersInGroupCommand({
      GroupName: form.group,
      UserPoolId: env.COGNITO_USER_POOLS_ID,
    })
    const response = await cognito.send(command)
    return c.status(200)
  },
)

app.post(
  "/sign-user-out",
  validate(
    object({
      username: string(),
    }),
  ),
  async (c) => {
    const form = c.req.valid("form")
    const command = new AdminUserGlobalSignOutCommand({
      Username: form.username,
      UserPoolId: env.COGNITO_USER_POOLS_ID,
    })
    const response = await cognito.send(command)
    return c.status(200)
  },
)
