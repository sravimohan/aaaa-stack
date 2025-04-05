import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

// Your current setup looks correct with:

// A VPC with proper configuration including:

// Public subnets for your load balancer
// Private subnets with NAT Gateway access for your tasks
// NAT Gateway for internet access
// VPC Endpoints for AWS services to optimize traffic:

// S3 Gateway endpoint for ECR image layers
// ECR API and Docker endpoints for image pulling
// ECS endpoint for container management
// CloudWatch Logs endpoint for logging
// Proper security group configuration for VPC endpoints

// A Fargate service with:

// Private subnet placement (assignPublicIp: false)
// Proper container configuration with logging
// HTTPS support via ACM certificate (when provided)
// This architecture gives you a good balance of security and functionality:

// Your containers can access the internet through the NAT Gateway
// AWS service traffic stays within the AWS network via VPC endpoints
// Your containers are protected from direct internet access

export class AppCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const { ecrRepositoryUri, imageTag, acmCertificateArn } = this.getCnfParameters();

    const taskDefinition = this.createFargateTaskDefinition(ecrRepositoryUri, imageTag);

    // Get the certificate from the ARN parameter if provided
    let certificate = this.getCertificateByArn(acmCertificateArn);

    // Create VPC with a NAT Gateway for outbound internet access
    const vpc = new ec2.Vpc(this, 'Vpc', {
      natGateways: 1, // Add a NAT Gateway in one availability zone
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Private subnets with NAT Gateway access
          cidrMask: 24
        },
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24
        }
      ]
    });

    // Create security group for VPC endpoints
    const vpcEndpointSecurityGroup = new ec2.SecurityGroup(this, 'VpcEndpointSecurityGroup', {
      vpc,
      description: 'Security Group for VPC Endpoints',
      allowAllOutbound: true
    });

    // Allow HTTPS inbound from the VPC CIDR 
    vpcEndpointSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      'Allow HTTPS from within the VPC'
    );

    // Add S3 Gateway endpoint - CRITICAL for ECR
    vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3
    });

    // Add ECR API endpoint with private DNS enabled
    vpc.addInterfaceEndpoint('EcrApiEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      privateDnsEnabled: true,
      securityGroups: [vpcEndpointSecurityGroup]
    });

    // Add ECR Docker endpoint with private DNS enabled
    vpc.addInterfaceEndpoint('EcrDkrEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      privateDnsEnabled: true,
      securityGroups: [vpcEndpointSecurityGroup]
    });

    // Add ECS endpoint with private DNS enabled
    vpc.addInterfaceEndpoint('EcsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECS,
      privateDnsEnabled: true,
      securityGroups: [vpcEndpointSecurityGroup]
    });

    // Add CloudWatch Logs endpoint - needed for container logs
    vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      privateDnsEnabled: true,
      securityGroups: [vpcEndpointSecurityGroup]
    });

    // Create the Fargate service
    new ecsp.ApplicationLoadBalancedFargateService(this, `${id}-web-server`, {
      taskDefinition,
      publicLoadBalancer: true,
      certificate: certificate,
      redirectHTTP: certificate !== undefined,
      vpc: vpc,
      assignPublicIp: false // Make sure tasks use private subnets
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
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'AppContainerLogs',
        logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK,
      }),
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