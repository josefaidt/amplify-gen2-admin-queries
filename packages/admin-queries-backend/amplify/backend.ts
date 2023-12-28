import { defineBackend } from "@aws-amplify/backend"
import { AdminQueries } from "admin-queries-construct"
import { auth } from "./auth/resource"
import { AuthGroup } from "./custom/AuthGroup"

const backend = defineBackend({
  auth,
})

const { cfnResources, userPool, userPoolClient } = backend.auth.resources

// define the groups
const GROUPS = {
  ADMINS: "ADMINS",
} as const

// create a stack to host the Cognito User Pool Groups
const groupsStack = backend.createStack("AuthGroups")
const groups: Record<keyof typeof GROUPS | string, AuthGroup> = {}
for (const group of Object.keys(GROUPS)) {
  // create each group using a reference to the Cognito User Pool created by defineAuth
  groups[group] = new AuthGroup(groupsStack, `AuthGroup${group}`, {
    name: group,
    userPoolId: userPool.userPoolId,
    identityPoolId: cfnResources.cfnIdentityPool.ref,
  })
}

const adminQueriesStack = backend.createStack("AdminQueries")
const adminQueries = new AdminQueries(adminQueriesStack, "AdminQueries", {
  // @ts-ignore
  userPool,
  // @ts-ignore
  userPoolClients: [userPoolClient],
  allowGroups: [GROUPS.ADMINS],
  cors: {
    allowOrigins: ["http://localhost:5173"],
    allowCredentials: true,
  },
})

adminQueries.enableApiLogging()
