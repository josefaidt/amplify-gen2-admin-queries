import * as cdk from "aws-cdk-lib/core"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as iam from "aws-cdk-lib/aws-iam"
import { Construct } from "constructs"

export type AuthGroupProps = {
  /**
   * Group name
   */
  name: string
  /**
   * User Pool ID to create with
   */
  userPoolId: string
}

export class AuthGroup extends Construct {
  public group: cognito.CfnUserPoolGroup
  public role: iam.Role

  constructor(scope: Construct, id: string, props: AuthGroupProps) {
    super(scope, id)

    const { name, userPoolId } = props

    const userPoolGroupRole = new iam.Role(scope, `Group${name}Role`, {
      assumedBy: new iam.ServicePrincipal("cognito-idp.amazonaws.com", {
        conditions: {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": userPoolId,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
      }),
    })

    const userPoolGroup = new cognito.CfnUserPoolGroup(scope, `Group${name}`, {
      userPoolId: userPoolId,
      groupName: name,
      roleArn: userPoolGroupRole.roleArn,
    })

    this.group = userPoolGroup
    this.role = userPoolGroupRole

    new cdk.CfnOutput(this, "GroupNameOutput", {
      value: userPoolGroup.groupName!,
      exportName: `${name}Group`,
    })

    new cdk.CfnOutput(this, "GroupRoleArn", {
      value: userPoolGroupRole.roleArn,
    })
  }
}
