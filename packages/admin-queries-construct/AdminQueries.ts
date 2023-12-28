import type { FunctionUrlCorsOptions } from 'aws-cdk-lib/aws-lambda'
import * as mod from 'node:module'
import * as cdk from 'aws-cdk-lib/core'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as iam from 'aws-cdk-lib/aws-iam'
import { FunctionUrlAuthType, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs'

const require = mod.createRequire(import.meta.url)

export type AdminQueriesProps = {
  /**
   * Amazon Cognito User Pool ARN
   */
  userPoolArn: string
  /**
   * Allow IAM roles to call this Function by its URL
   */
  allowRoles: iam.Role[]
  /**
   * CORS options
   */
  cors?: FunctionUrlCorsOptions
}

export class AdminQueries extends Construct {
  public readonly handler: NodejsFunction
  public readonly url: string

  constructor(scope: Construct, id: string, props: AdminQueriesProps) {
    super(scope, id)

    const userPool = cognito.UserPool.fromUserPoolArn(
      this,
      'AdminUserPool',
      props.userPoolArn
    )

    const handler = new NodejsFunction(this, 'AdminQueries', {
      runtime: Runtime.NODEJS_20_X,
      entry: require.resolve('admin-queries-api/handler'),
      bundling: {
        format: OutputFormat.ESM,
      },
      environment: {
        COGNITO_USER_POOL_ID: userPool.userPoolId,
      },
    })

    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:ListUsersInGroup',
          'cognito-idp:AdminUserGlobalSignOut',
          'cognito-idp:AdminEnableUser',
          'cognito-idp:AdminDisableUser',
          'cognito-idp:AdminRemoveUserFromGroup',
          'cognito-idp:AdminAddUserToGroup',
          'cognito-idp:AdminListGroupsForUser',
          'cognito-idp:AdminGetUser',
          'cognito-idp:AdminConfirmSignUp',
          'cognito-idp:ListUsers',
          'cognito-idp:ListGroups',
        ],
        resources: [props.userPoolArn],
      })
    )

    const functionUrl = handler.addFunctionUrl({
      authType: FunctionUrlAuthType.AWS_IAM,
      cors: props.cors,
    })

    for (const role of props.allowRoles) {
      functionUrl.grantInvokeUrl(role)
    }

    this.handler = handler
    this.url = functionUrl.url

    new cdk.CfnOutput(this, 'AdminQueriesUrl', {
      value: this.url,
      exportName: 'ADMIN-QUERIES-URL',
    })
  }
}
