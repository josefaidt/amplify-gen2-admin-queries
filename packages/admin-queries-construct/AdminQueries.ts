import * as mod from "node:module"
import * as cdk from "aws-cdk-lib/core"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as iam from "aws-cdk-lib/aws-iam"
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2"
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations"
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers"
import * as logs from "aws-cdk-lib/aws-logs"
import { Runtime } from "aws-cdk-lib/aws-lambda"
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs"
import { Construct } from "constructs"

const require = mod.createRequire(import.meta.url)

export type AdminQueriesProps = {
  /**
   * Amazon Cognito User Pool ARN
   */
  userPool: cognito.IUserPool
  /**
   * Optional User Pool Clients to use to authenticate with the API
   */
  userPoolClients?: cognito.IUserPoolClient[]
  /**
   * Allow IAM roles to call this Function by its URL
   */
  allowGroups: string[]
  /**
   * CORS options
   */
  cors?: apigwv2.CorsPreflightOptions
}

export class AdminQueries extends Construct {
  public readonly api: apigwv2.HttpApi
  public readonly handler: NodejsFunction
  public readonly url: string

  constructor(scope: Construct, id: string, props: AdminQueriesProps) {
    super(scope, id)

    const handler = new NodejsFunction(this, "AdminQueries", {
      runtime: Runtime.NODEJS_20_X,
      entry: require.resolve("admin-queries-api/handler"),
      bundling: {
        format: OutputFormat.ESM,
      },
      environment: {
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        ALLOWED_GROUPS: JSON.stringify(props.allowGroups),
      },
    })

    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "cognito-idp:ListUsersInGroup",
          "cognito-idp:AdminUserGlobalSignOut",
          "cognito-idp:AdminEnableUser",
          "cognito-idp:AdminDisableUser",
          "cognito-idp:AdminRemoveUserFromGroup",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminListGroupsForUser",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminConfirmSignUp",
          "cognito-idp:ListUsers",
          "cognito-idp:ListGroups",
        ],
        resources: [props.userPool.userPoolArn],
      }),
    )

    const integration = new integrations.HttpLambdaIntegration(
      "Integration",
      handler,
    )

    const api = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: "AdminQueries",
      defaultAuthorizer: new authorizers.HttpUserPoolAuthorizer(
        "Authorizer",
        props.userPool,
        {
          userPoolClients: props.userPoolClients,
        },
      ),
      defaultIntegration: integration,
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.HEAD,
        ],
        allowHeaders: ["Content-Type", "Authorization"],
        exposeHeaders: ["Date", "x-api-id"],
        maxAge: cdk.Duration.seconds(600),
        // allowCredentials: true,
        ...props.cors,
      },
      disableExecuteApiEndpoint: false,
    })

    // this should never happen but "url" is string | undefined
    if (!api.url) {
      throw new Error("Something went wrong configuring the API URL")
    }

    this.api = api
    this.handler = handler
    this.url = api.url

    new cdk.CfnOutput(this, "AdminQueriesUrl", {
      value: this.url,
      exportName: "ADMIN-QUERIES-URL",
    })
  }

  public enableApiLogging(options?: {
    retention: logs.LogGroupProps["retention"]
    removalPolicy: logs.LogGroupProps["removalPolicy"]
    format: apigwv2.CfnStage.AccessLogSettingsProperty["format"]
  }) {
    const stage = this.api.defaultStage!.node.defaultChild as apigwv2.CfnStage
    const logGroup = new logs.LogGroup(this, "LogGroup", {
      retention: options?.retention || 90,
      removalPolicy: options?.removalPolicy || cdk.RemovalPolicy.DESTROY,
    })

    stage.accessLogSettings = {
      destinationArn: logGroup.logGroupArn,
      format: options?.format,
      // JSON.stringify({
      //   requestId: "$context.requestId",
      //   userAgent: "$context.identity.userAgent",
      //   sourceIp: "$context.identity.sourceIp",
      //   requestTime: "$context.requestTime",
      //   httpMethod: "$context.httpMethod",
      //   path: "$context.path",
      //   status: "$context.status",
      //   responseLength: "$context.responseLength",
      // }),
    }

    logGroup.grantWrite(new iam.ServicePrincipal("apigateway.amazonaws.com"))
  }
}
