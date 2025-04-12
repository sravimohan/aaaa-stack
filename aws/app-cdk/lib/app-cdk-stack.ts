import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Construct } from 'constructs';

export class AppCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const { ecrRepositoryUri, imageTag, acmCertificateArn, customDomainName } = this.getCnfParameters();

    const taskDefinition = this.createFargateTaskDefinition(ecrRepositoryUri, imageTag);

    // Get the certificate from the ARN parameter for the custom domain
    const certificate = this.getCertificateByArn(acmCertificateArn);

    // Create VPC with all required networking configuration
    const vpc = this.createNetworkInfrastructure();

    // Create the Fargate service with ALB
    const fargateService = new ecsp.ApplicationLoadBalancedFargateService(this, `${id}-web-server`, {
      taskDefinition,
      publicLoadBalancer: false, // Load Balancer will not be internet-facing.
      openListener: false, // Load Balancer, security group will not allow ingress from all IP addresses.
      vpc: vpc,
      assignPublicIp: false // Ensure tasks use private subnets
    });

    // Create a VPC Link using CfnVpcLink
    const vpcLink = this.createVpcLink(vpc, id);

    // Create API Gateway HTTP API with default endpoint disabled
    const api = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `${id}-http-api`,
      disableExecuteApiEndpoint: true, // Disable the default endpoint
    });

    // Integrate API Gateway with ALB target
    const albIntegration = new integrations.HttpAlbIntegration('AlbIntegration', fargateService.listener, {
      vpcLink: apigatewayv2.VpcLink.fromVpcLinkAttributes(this, 'VpcLink', {
        vpcLinkId: vpcLink.ref,
        vpc: vpc,
      }),
    });

    // Add a proxy route to the API Gateway
    api.addRoutes({
      path: '/{proxy+}', // Proxy route to forward all requests
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: albIntegration,
    });

    // Add a custom domain to API Gateway
    if (customDomainName.valueAsString && certificate) {
      const domainName = new apigatewayv2.CfnDomainName(this, 'ApiCustomDomain', {
        domainName: customDomainName.valueAsString, // Ensure this is explicitly passed as a string
        domainNameConfigurations: [
          {
            certificateArn: certificate.certificateArn,
            endpointType: 'REGIONAL',
          },
        ],
      });

      new apigatewayv2.CfnApiMapping(this, 'ApiMapping', {
        apiId: api.apiId,
        domainName: domainName.ref,
        stage: '$default', // Use the default stage
      });
    }

    // Restrict ALB security group to allow traffic only from VPC Link
    if (vpcLink.securityGroupIds && vpcLink.securityGroupIds.length > 0) {
      fargateService.loadBalancer.connections.securityGroups[0].addIngressRule(
        ec2.Peer.securityGroupId(vpcLink.securityGroupIds[0]),
        ec2.Port.tcp(80),
        'Allow traffic only from VPC Link'
      );
    }
  }

  private createVpcLink(vpc: cdk.aws_ec2.Vpc, id: string) {
    const vpcLinkSecurityGroup = new ec2.SecurityGroup(this, 'VpcLinkSecurityGroup', {
      vpc,
      description: 'Security Group for VPC Link',
      allowAllOutbound: true,
    });

    vpcLinkSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from within the VPC'
    );

    const vpcLink = new apigatewayv2.CfnVpcLink(this, 'MyCfnVpcLink', {
      name: `${id}-vpc-link`,
      subnetIds: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds,
      securityGroupIds: [vpcLinkSecurityGroup.securityGroupId],
    });

    return vpcLink;
  }

  private getCnfParameters() {
    // ACM Certificate ARN - optional
    const acmCertificateArn = new cdk.CfnParameter(this, 'AcmCertificateArn', {
      type: 'String',
      description: 'ARN of the ACM certificate to use for HTTPS',
      default: '',
    });

    // Custom Domain Name - optional
    const customDomainName = new cdk.CfnParameter(this, 'CustomDomainName', {
      type: 'String',
      description: 'Custom domain name for the API Gateway',
      default: '',
    });

    // validate if customDomainName is not empty then certificate ARN must be provided and vice versa
    if (customDomainName.valueAsString && !acmCertificateArn.valueAsString) {
      throw new Error('If CustomDomainName is provided, AcmCertificateArn must also be provided');
    }

    if (!customDomainName.valueAsString && acmCertificateArn.valueAsString) {
      throw new Error('If AcmCertificateArn is provided, CustomDomainName must also be provided');
    }

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

    return { ecrRepositoryUri, imageTag, acmCertificateArn, customDomainName };
  }

  private createNetworkInfrastructure(): ec2.Vpc {
    // VPC with,
    // Public subnets for your load balancer
    // Private subnets access for your tasks

    // OPTIONAL: NAT Gateway for internet access. Required if your tasks need to access the internet (e.g., validating JWT Token with Azure AD)
    // In this sample application, ASP.Net Web Api needs to access Azure AD for JWT Token validation.
    // If you don't need internet access, you can set natGateways to 0.
    // By default, the NAT Gateway will allow all traffic to the internet. You can restrict the traffic, by adding SecurityGroups to the NAT Gateway.

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

    this.createVpcInterfaceEndpointsForECR(vpc);

    return vpc;
  }

  // Configuring Amazon ECR to use an interface VPC endpoint. 
  // VPC Endpoints for AWS services to optimize traffic by keeping ECS to ECR traffic within the AWS network.
  // VPC endpoints are powered by AWS PrivateLink, a technology that enables you to privately access Amazon ECR APIs 
  // through private IP addresses. AWS PrivateLink restricts all network traffic between your VPC and Amazon ECR to 
  // the Amazon network. You don't need an internet gateway, a NAT device, or a virtual private gateway.
  // For more information, see the AWS PrivateLink documentation.
  // https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
  private createVpcInterfaceEndpointsForECR(vpc: cdk.aws_ec2.Vpc) {
    // Create security group for VPC endpoints
    const vpcEndpointSecurityGroup = new ec2.SecurityGroup(this, 'VpcEndpointSecurityGroup', {
      vpc,
      description: 'Security Group for VPC Endpoints',
      allowAllOutbound: true
    });

    vpcEndpointSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      'Allow HTTPS from within the VPC'
    );

    // S3 Gateway endpoint for ECR image layers    
    vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3
    });

    // ECR API and Docker endpoints for image pulling with private DNS enabled
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