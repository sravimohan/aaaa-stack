import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export class AppCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const { ecrRepositoryUri, imageTag, acmCertificateArn } = this.getCnfParameters();

    const taskDefinition = this.createFargateTaskDefinition(ecrRepositoryUri, imageTag);

    // Get the certificate from the ARN parameter if provided
    let certificate = this.getCertificateByArn(acmCertificateArn);

    new ecsp.ApplicationLoadBalancedFargateService(this, `${id}-web-server`, {
      taskDefinition,
      publicLoadBalancer: true,
      certificate: certificate, // Use the certificate if provided
      redirectHTTP: certificate !== undefined, // Redirect HTTP to HTTPS if certificate is provided
    });
  }

  private getCnfParameters() {
    // ACM Certificate ARN - optional
    const acmCertificateArn = new cdk.CfnParameter(this, 'AcmCertificateArn', {
      type: 'String',
      description: 'ARN of the ACM certificate to use for HTTPS',
      default: '',
    });

    // ECR Repository URI - required
    const ecrRepositoryUri = new cdk.CfnParameter(this, 'EcrRepositoryUri', {
      type: 'String',
      description: 'URI of the ECR repository to pull the image from (without the tag)',
    });

    if (!ecrRepositoryUri.valueAsString || ecrRepositoryUri.valueAsString.trim() === '') {
      throw new Error('EcrRepositoryUri parameter is not supplied or is empty');
    }

    // ECR Image Tag - required
    const imageTag = new cdk.CfnParameter(this, 'EcrImageTag', {
      type: 'String',
      description: 'Tag of the Docker image to deploy',
    });

    if (!imageTag.valueAsString || imageTag.valueAsString.trim() === '') {
      throw new Error('EcrImageTag parameter is not supplied or is empty');
    }

    return { ecrRepositoryUri, imageTag, acmCertificateArn };
  }

  private createFargateTaskDefinition(ecrRepositoryUri: cdk.CfnParameter, imageTag: cdk.CfnParameter) {
    const taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    taskExecutionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
    );

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      executionRole: taskExecutionRole,
    });

    const containerImage = ecs.ContainerImage.fromRegistry(
      `${ecrRepositoryUri.valueAsString}:${imageTag.valueAsString}`
    );

    this.ensureContainerImageIsValid(containerImage);

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

    return taskDefinition;
  }

  private ensureContainerImageIsValid(containerImage: ecs.ContainerImage) {
    if (!containerImage) {
      throw new Error('Container image is not valid');
    }
  }

  private getCertificateByArn(acmCertificateArn: cdk.CfnParameter) {
    if (!acmCertificateArn.valueAsString) {
      return undefined;
    }

    return certificatemanager.Certificate.fromCertificateArn(
      this,
      'Certificate',
      acmCertificateArn.valueAsString
    );
  }
}