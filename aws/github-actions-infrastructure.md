# Setting up GitHub Actions Build and Deploy Infrastructure

> **⚠️⚠️⚠️ Following this steps might incur costs in AWS ⚠️⚠️⚠️**
>
> Please ensure you delete the resources afterwards if they are not required.

## Overview

As part of CI/CD infrastructure, we will setup

- GitHub OIDC Provider in AWS for secure, credential-free access from GitHub Action Workflows to your AWS account
- AWS ECR Repository for storing Container images
- GitHub Actions build role with minimal permissions to push to ECR repository
- GitHub Actions deploy role with minimal permissions to create/update ECS Cluster
- GitHub Actions Build workflow for build, test, create contaner image and push to ECR
- GitHub Actions Deploy workflow for create/update ECS Cluster

## Prerequiste

Install and setup AWS CLI and configure the necesarry permissions to create/ update cloudformation stack and create IAM role and permissions.

Refer to [AWS CLI Getting Started Guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html) for detailed instructions on installing and configuring the AWS Command Line Interface (CLI).

Alternarively you can sign into your AWS Console and use CloudShell. It comes pre-prepared with everything you need to run AWS CLI commands.

> ⚠️ For the below commands, If you are using PowerShell, replace the backslashes `\` in the commands with backticks `` ` `` for line continuation.

## Setup GitHub OIDC Provider

> ⚠️ This only needs to be created once per AWS account. If you already have this in your AWS account, you can skip this step.

OpenID Connect (OIDC) allows your GitHub Actions workflows to access resources in Amazon Web Services (AWS), without needing to store the AWS credentials as long-lived GitHub secrets.

### 1. Create OpenID Connect Provider Command

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
```

### Sample Output

```bash
{
  "OpenIDConnectProviderArn": "arn:aws:iam::111111111111:oidc-provider/token.actions.githubusercontent.com"
}
```

Note the output arn. This will be required as input for the next step.

### List Existing OpenID Connect Providers

To view an existing OpenID Connect Provider for GitHub, use the following command:

```bash
aws iam list-open-id-connect-providers
```

## 2. Setup ECR Repository and IAM Roles for the Build and Deploy workflows

In this step, we will be creating:

### ECR Repository (AWS::ECR::Repository)

- Private container registry for Container images
- Automatic vulnerability scanning on image push
- Immutable tags to prevent overwriting
- AES-256 encryption for images

### IAM Role for GitHub Actions Build (AWS::IAM::Role)

- Dedicated role for GitHub Actions workflows
- Trust policy for specific GitHub repositories
- OIDC claims to restrict branch access
- Minimal ECR permissions

### IAM Role for GitHub Actions Deploy (AWS::IAM::Role)

- Dedicated role for GitHub Actions workflows
- Minimal ECR and ECS permissions

We will create the above resoures using a cloudformation yaml file.

> ❓ Why use CloudFormation instead of CDK?
>
> This setup is needed only once or rarely. It's a manual step to bootstrap the CI/CD workflows.
>
> Using CloudFormation YAML keeps it simple and allows execution in AWS CloudShell without extra dependencies.

### Replace Placeholders with values in the below commands

Before running the commands to create or update the CloudFormation stack, replace the placeholders with your actual values.

- `<your stack name>`: The name for your CloudFormation stack, e.g., `your-stack-name-github-workflow`.
- `<your OpenID Connect Provider Arn>`: The OpenID Connect Provider Arn created from the previous step.
- `<your github org name>`: The name of your GitHub organization.
- `<your github repository name>`: The name of your GitHub repository.

> ⚠️ If you are using PowerShell, replace the backslashes `\` in the commands with backticks `` ` `` for line continuation.

### CloudFormation File

The CloudFormation file can be found here, [aws/github-actions-infrastructure.yaml](https://github.com/sravimohan/aaaa-stack/blob/main/aws/github-actions-infrastructure.yaml)

> ℹ️ If you are using AWS CloudShell, upload this file using the `CloudShell -> Actions -> Upload File` menu.

### Create Stack

```bash
aws cloudformation create-stack \
  --stack-name <your stack name> \
  --template-body file://github-actions-infrastructure.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=GitHubActionsOIDCProviderArn,ParameterValue=<your OpenID Connect Provider Arn>
    ParameterKey=GitHubOrg,ParameterValue=<your github org name> \
    ParameterKey=GitHubRepo,ParameterValue=<your github repository name>
```

Wait for the stack to be created. You can check the status of the stack with,

```bash
aws cloudformation describe-stacks --stack-name <your stack name> --query "Stacks[0].StackStatus"
```

> ℹ️ To update an existing stack, you can use the above command replacing `create-stack` with `update-stack`.

### View Stack

```bash
aws cloudformation describe-stacks --stack-name <your stack name> --query "Stacks[0].Outputs"
```

### Sample CloudFormation Output

```bash
[
    {
        "OutputKey": "GitHubActionsBuildRoleArn",
        "OutputValue": "arn:aws:iam::111111111111:role/aaaa-stack-GitHubActions-Build-Role",
        "Description": "Build Role ARN used in GitHub Actions Secret, AWS_BUILD_ROLE_ARN_TO_ASSUME"
    },
    {
        "OutputKey": "GitHubActionsDeployRoleArn",
        "OutputValue": "arn:aws:iam::111111111111:role/aaaa-stack-GitHubActions-Deploy-Role",
        "Description": "Deploy Role ARN used in GitHub Actions Secret, AWS_DEPLOY_ROLE_ARN_TO_ASSUME"
    },
    {
        "OutputKey": "ECRRepositoryUri",
        "OutputValue": "111111111111.dkr.ecr.ap-southeast-2.amazonaws.com/aaaa-stack",
        "Description": "URI of the ECR Repository"
    }
]
```

## CloudFormation Outputs

The CloudFormation template provides the following outputs that can be used in your GitHub Actions workflows:

- ECRRepositoryUri,

  - URI of the ECR Repository
  - Used in build workflow in the `Publish Docker Image to Amazon ECR` step
  - 👉 Add this value to GitHub repository secrets as `AWS_ECR_REPOSITORY_URI`

- GitHubActionsBuildRoleArn

  - ARN of the IAM role for GitHub Actions build workflows
  - Used in build workflow in the `aws-actions/configure-aws-credentials` step
  - 👉 Add this value to GitHub repository secrets as `AWS_BUILD_ROLE_ARN_TO_ASSUME`

- GitHubActionsDeployRoleArn
  - ARN of the IAM role for GitHub Actions deployment workflows
  - Used in deployment workflow in the `aws-actions/configure-aws-credentials` step
  - 👉 Add this value to GitHub repository secrets as `AWS_DEPLOY_ROLE_ARN_TO_ASSUME`

### To delete the stack

```bash
aws cloudformation delete-stack --stack-name <your stack name>
```

## 3. Setup secrets in your Github Repository

> ℹ️ You can login into your GitHub account and manually setup the secrets in your UI or you can use the GitHub CLI.

- AWS_REGION: your AWS Region e.g., us-west-2
- AWS_ECR_REPOSITORY_URI: CloudFormation output of `ECRRepositoryUri`
- AWS_BUILD_ROLE_ARN_TO_ASSUME: Cloudformation output of `GitHubActionsBuildRoleArn`
- AWS_DEPLOY_ROLE_ARN_TO_ASSUME: Cloudformation output of `GitHubActionsDeployRoleArn`

## 4. Build

You can trigger the GitHub Actions Build Workflow either manually or by pushing your commit.

## 4. Deploy

You can trigger the GitHub Actions Deploy Workflow either manually or by pushing your commit.

## Further Reading

- [Configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

- [Use IAM roles to connect GitHub Actions to actions in AWS](https://aws.amazon.com/blogs/security/use-iam-roles-to-connect-github-actions-to-actions-in-aws/)
