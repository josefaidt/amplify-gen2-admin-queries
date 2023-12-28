import type { Role } from "aws-cdk-lib/aws-iam"
import { defineBackend } from "@aws-amplify/backend"
import { AdminQueries } from "admin-queries-construct"
import { auth } from "./auth/resource"
import { AuthGroup } from "./custom/AuthGroup"

const backend = defineBackend({
  auth,
})

const { authenticatedUserIamRole, userPool } = backend.auth.resources

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
  })
}

const adminQueriesStack = backend.createStack("AdminQueries")
new AdminQueries(adminQueriesStack, "AdminQueries", {
  userPoolArn: userPool.userPoolArn,
  allowRoles: [groups.ADMINS.role, authenticatedUserIamRole as Role],
})
