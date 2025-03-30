import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';

export class AppCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cloudformation Parameters

    // ACM Certificate ARN - optional
    const acmCertificateArn = new cdk.CfnParameter(this, 'AcmCertificateArn', {
      type: 'String',
      description: 'ARN of the ACM certificate to use for HTTPS',
      default: '',
    });

    // ECR Repository ARN - required
    const ecrRepositoryArn = new cdk.CfnParameter(this, 'EcrRepositoryArn', {
      type: 'String',
      description: 'ARN of the ECR repository to pull the image from',
    });

    if (!ecrRepositoryArn.valueAsString || ecrRepositoryArn.valueAsString.trim() === '') {
      throw new Error('EcrRepositoryArn parameter is not supplied or is empty');
    }

    // Image Tag - required
    const imageTag = new cdk.CfnParameter(this, 'ImageTag', {
      type: 'String',
      description: 'Tag of the Docker image to deploy',
    });

    if (!imageTag.valueAsString || imageTag.valueAsString.trim() === '') {
      throw new Error('ImageTag parameter is not supplied or is empty');
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

    const ecrRepository = ecr.Repository.fromRepositoryArn(
        this, "EcrRepository", "arn:aws:ecr:ap-southeast-2:258032939606:repository/aaaa-stack"
    )
     
    // const ecrRepository = ecr.Repository.fromRepositoryName(
    //   this,
    //   'EcrRepository',
    //   "aaaa-stack"
    // );

    const containerImage = ecs.ContainerImage.fromEcrRepository(
      ecrRepository,
      imageTag.valueAsString
    );

    taskDefinition.addContainer('AppContainer', {
      image: containerImage,
      environment: {
        ASPNETCORE_HTTP_PORTS: '8080',
      },
      portMappings: [
        {
          containerPort: 8080,
        },
      ],
    });

    // Get the certificate from the ARN parameter if provided
    let certificate;
    if (acmCertificateArn.valueAsString && acmCertificateArn.valueAsString !== '') {
      certificate = certificatemanager.Certificate.fromCertificateArn(
        this,
        'Certificate',
        acmCertificateArn.valueAsString
      );
    }

    new ecsp.ApplicationLoadBalancedFargateService(this, `${id}-web-server`, {
      taskDefinition,
      publicLoadBalancer: true,
      certificate: certificate, // Use the certificate if provided
      redirectHTTP: certificate !== undefined, // Redirect HTTP to HTTPS if certificate is provided
    });
  }
}
