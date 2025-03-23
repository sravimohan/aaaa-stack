# Setting up Build Infrastructure

**Warning: This step will incur costs in AWS. Please ensure you delete the resources afterwards if they are not required.**

## Overview

As part of build infrastructure, we will need to setup

- AWS ECR Repository
- Permissions for GitHub Actions to push to AWS ECR
- Github Actions Workflow

## Build Infrastructure Cloudformation

We will create the AWS ECR Repository and Permissions for GitHub Actions to push to AWS ECR in the same cloudformation file. This allows us to refer to the ECR ARN directly in configuring the Role with minimal permissions.

This step will need to be done manually by running the `aws cloudformation create-stack`.

### Resources in the Build Infrastructure CloudFormation

The CloudFormation template defines the following key resources:

Cloudformation file:
[aws\build-infrastructure.yaml](/aws/build-infrastructure.yaml)

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

#### IAM Role for GitHub Actions (AWS::IAM::Role)

- Creates a dedicated role with a descriptive name for GitHub Actions workflows
- Configures trust policy to only allow specific GitHub repositories to assume the role
- Restricts access to specific repository branches through OIDC claims
- Implements the principle of least privilege with specific ECR permissions:
  - GetAuthorizationToken: Allows authentication with ECR
  - Various ECR actions: Enables push/pull capabilities for container images

These resources work together to enable secure, credential-free deployment of Docker images from GitHub Actions workflows to Amazon ECR while - maintaining proper security boundaries and access controls.

OpenID Connect (OIDC) allows your GitHub Actions workflows to access resources in Amazon Web Services (AWS), without needing to store the AWS credentials as long-lived GitHub secrets.

#### CloudFormation Outputs

The CloudFormation template provides the following outputs that can be used in your GitHub Actions workflow:

- **ECRRepositoryArn**
  - ARN identifies the ECR repository and can be used in IAM policies for more granular access control
  - Used by the Build GitHub Actions to push the image.

- **GitHubActionsRoleArn**
  - ARN of the IAM role for GitHub Actions.
  - Add this value to your GitHub repository secrets as AWS_ACTIONS_ROLE_ARN_TO_ASSUME.
  - Referenced in your GitHub Actions workflow in the aws-actions/configure-aws-credentials step
  - Enables your workflow to authenticate with AWS via OpenID Connect

After deploying this CloudFormation stack, you can access these outputs in the AWS Console under the Outputs tab of your stack, or via AWS CLI:

#### Cloudformation commands

*Replace ```<RepositoryName>``` with your own repository name.*

##### Create the stack

````bash
aws cloudformation create-stack \
--stack-name <RepositoryName>BuildStack \
--template-body file://build-infrastructure.yaml \
--parameters ParameterKey=GitHubOrg,ParameterValue=sravimohan ParameterKey=GitHubRepo,ParameterValue=aaaa-stack \
--capabilities CAPABILITY_NAMED_IAM
````

##### Update the stack

````bash
aws cloudformation delete-stack --stack-name <RepositoryName>BuildStack
````

##### Delete the stack

````bash
aws cloudformation create-stack \
--stack-name <RepositoryName>BuildStack \
--template-body file://build-infrastructure.yaml \
--parameters ParameterKey=GitHubOrg,ParameterValue=sravimohan ParameterKey=GitHubRepo,ParameterValue=aaaa-stack \
--capabilities CAPABILITY_NAMED_IAM
````

 To update the stack, use:
   aws cloudformation update-stack --stack-name GitHubActionsPermissionsStack --template-body file://build-infrastructure.yaml --parameters ParameterKey=GitHubOrg,ParameterValue=<your-github-org> ParameterKey=GitHubRepo,ParameterValue=<your-github-repo> --capabilities CAPABILITY_NAMED_IAM

 To delete the stack, use:
   aws cloudformation delete-stack --stack-name GitHubActionsPermissionsStack


## Further Reading

- [Configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

- [Use IAM roles to connect GitHub Actions to actions in AWS](https://aws.amazon.com/blogs/security/use-iam-roles-to-connect-github-actions-to-actions-in-aws/)
