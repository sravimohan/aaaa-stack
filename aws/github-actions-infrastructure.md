# Setting up GitHub Actions Build and Deploy Infrastructure

**Warning: This step will incur costs in AWS. Please ensure you delete the resources afterwards if they are not required.**

## Overview

As part of CI/CD infrastructure, we will setup

- AWS ECR Repository
- GitHub Actions build role for GitHub Actions
- GitHub Actions deploy role for GitHub Actions
- GitHub Actions Build workflow
- GitHub Actions Deploy workflow

## CI/CD Infrastructure

#### ECR Repository (AWS::ECR::Repository)

- Creates a private container registry to store Docker images
- Enables automatic vulnerability scanning on image push
- Uses immutable tags to prevent overwriting existing images
- Implements AES-256 encryption for container images

#### GitHub OIDC Provider (AWS::IAM::OIDCProvider)

- Establishes a trust relationship between AWS and GitHub
- Enables GitHub Actions to authenticate with AWS without storing long-lived credentials
- Uses the GitHub OIDC endpoint (token.actions.githubusercontent.com)
- Accepts tokens intended for the AWS STS service

#### IAM Role for GitHub Actions for Build (AWS::IAM::Role)

- Creates a dedicated role with a descriptive name for GitHub Actions workflows
- Configures trust policy to only allow specific GitHub repositories to assume the role
- Restricts access to specific repository branches through OIDC claims
- Implements the principle of least privilege with specific ECR permissions:
  - GetAuthorizationToken: Allows authentication with ECR
  - Various ECR actions: Enables push/pull capabilities for container images

#### IAM Role for GitHub Actions for Deploy (AWS::IAM::Role)

- Creates a dedicated role with a descriptive name for GitHub Actions workflows
- Configures trust policy to only allow specific GitHub repositories to assume the role
- Restricts access to specific repository branches through OIDC claims
- Implements the principle of least privilege with specific ECR and ECS permissions:
  - GetAuthorizationToken: Allows authentication with ECR
  - Various ECR actions: Enables pull capabilities for container images
  - Various ECS actions: Enables deployment capabilities for ECS services
  - PassRole: Allows passing the role to ECS tasks

These resources work together to enable secure, credential-free deployment of Docker images from GitHub Actions workflows to Amazon ECR while - maintaining proper security boundaries and access controls.

OpenID Connect (OIDC) allows your GitHub Actions workflows to access resources in Amazon Web Services (AWS), without needing to store the AWS credentials as long-lived GitHub secrets.

## CloudFormation Outputs

The CloudFormation template provides the following outputs that can be used in your GitHub Actions workflows:

### ECRRepositoryArn

- **Description**: ARN of the ECR Repository
- **Purpose**: Identifies the ECR repository and can be used in IAM policies for more granular access control
- **Usage**: Used as a reference in IAM policies

### GitHubActionsBuildRoleArn

- **Description**: ARN of the IAM role for GitHub Actions build workflows
- **Usage**:
  - Add this value to your GitHub repository secrets as `AWS_BUILD_ROLE_ARN_TO_ASSUME`
  - Referenced in your build workflow in the `aws-actions/configure-aws-credentials` step
  - Enables your workflow to authenticate with AWS via OpenID Connect for building and pushing Docker images

### GitHubActionsDeployRoleArn

- **Description**: ARN of the IAM role for GitHub Actions deployment workflows
- **Usage**:
  - Add this value to your GitHub repository secrets as `AWS_DEPLOY_ROLE_ARN_TO_ASSUME`
  - Referenced in your deployment workflow in the `aws-actions/configure-aws-credentials` step
  - Enables your workflow to authenticate with AWS via OpenID Connect for deploying applications to ECS

## How to Deploy

You can deploy from your local development environment with requiste aws cli and permissions setup. Alternatively you can login to your AWS Console and use Cloudshell. After deploying this CloudFormation stack, you can access these outputs in the AWS Console under the Outputs tab of your stack, or via AWS CLI

### To create the stack

> **Note**: If you are using PowerShell, replace the backslashes `\` in the commands with backticks `` ` `` for line continuation.

```bash
aws cloudformation create-stack \
  --stack-name <your stack name> \
  --template-body file://github-actions-infrastructure.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=GitHubOrg,ParameterValue=<your github org name> \
    ParameterKey=GitHubRepo,ParameterValue=<your github repository name>

```

### To update the stack

```bash
aws cloudformation update-stack \
  --stack-name <your stack name> \
  --template-body file://github-actions-infrastructure.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=GitHubOrg,ParameterValue=<your github org name> \
    ParameterKey=GitHubRepo,ParameterValue=<your github repository name>

```

### To view the stack

```bash
aws cloudformation describe-stacks --stack-name <RepositoryName>BuildStack --query "Stacks[0].Outputs"
```

### To delete the stack

```bash
aws cloudformation delete-stack --stack-name <your stack name>
```

### Cloudformation File:

[aws\github-actions-infrastructure.yaml](https://github.com/sravimohan/aaaa-stack/blob/main/aws/build-infrastructure.yaml)

## Further Reading

- [Configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

- [Use IAM roles to connect GitHub Actions to actions in AWS](https://aws.amazon.com/blogs/security/use-iam-roles-to-connect-github-actions-to-actions-in-aws/)
