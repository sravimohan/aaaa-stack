import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';

export class AppCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const ecrRepositoryUri = `${process.env.ECR_REPOSITORY_URI}:${process.env.IMAGE_TAG}`;
    if (!ecrRepositoryUri) {
      throw new Error('ECR_REPOSITORY_URI environment variable is not defined');
    }

    const taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    taskExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ],
      resources: ["*"], // Replace "*" with specific ECR repository ARN for tighter security
      effect: iam.Effect.ALLOW
    }));

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      executionRole: taskExecutionRole,
    });

    taskDefinition.addContainer('AppContainer', {
      image: ecs.ContainerImage.fromRegistry(ecrRepositoryUri),
      environment: {
        ASPNETCORE_HTTP_PORTS: '80',
      },
    });

    new ecsp.ApplicationLoadBalancedFargateService(this, 'MyWebServer', {
      taskDefinition,
      publicLoadBalancer: true
    });
  }
}
