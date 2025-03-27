import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';

export class AppCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const ecrRepositoryUri = process.env.ECR_REPOSITORY_URI;
    if (!ecrRepositoryUri) {
      throw new Error('ECR_REPOSITORY_URI environment variable is not defined');
    }

    new ecsp.ApplicationLoadBalancedFargateService(this, 'MyWebServer', {
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry(ecrRepositoryUri),
      },
      publicLoadBalancer: true
    });
  }
}
