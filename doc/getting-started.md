# Getting Started

## Get the Code

To get the code, you can clone the repository using the following command:

```sh
git clone https://github.com/sravimohan/aaaa-stack.git
```

## Azure AD (Entra ID)

To set up Azure AD Apps, scopes, and roles, please refer to the [Azure AD setup instructions](azure-ad.md).

## Angular Front-End

This sample is already set up with the Azure AD configuration and HTTP client interceptor. You will need to configure the Azure AD Client ID, Tenant ID, and your API URLs.

For detailed instructions, please refer to the [Angular Front-End instructions](../aaaa.client/README.md).

## ASP.NET Web API Back-End

The back-end of this sample is built using ASP.NET Web API. It is configured to work with Azure AD for authentication and authorization.

For detailed instructions, please refer to the [ASP.NET Web API Back-End instructions](../AAAA.Server/README.md).

## Build

### Prerequisites

Before you begin, ensure you have met the following requirements:

- You have an [AWS account](https://aws.amazon.com/).
- You have a GitHub account.
- Setup AWS ECR and GitHub Actions permissions to push to the ECR repository. Refer to the [Setting up Build Infrastructure instructions](/aws/build-infrastructure.md).

To run the GitHub build action, follow these steps:

- Ensure you have a GitHub Actions workflow file in your repository. The file should be located at `.github/workflows/build.yml`.

- Setup GitHub Actions Secrets

  - **AWS_ACCOUNT_ID**

    - Your 12-digit AWS account number
    - Used to construct ECR repository URLs

  - **AWS_REGION**

    - The AWS region where your resources are deployed
    - Example: us-east-1, ap-southeast-2

  - **AWS_BUILD_ROLE_ARN_TO_ASSUME**
    - The ARN of the GitHub Actions role created in your CloudFormation stack
    - Format: arn:aws:iam::{account-id}:role/{role-name}
    - This value can be found in the CloudFormation stack outputs

- Commit and push to your repository.
- The build action will automatically run whenever you push changes to the `main` branch or create a pull request targeting the `main` branch.

You can monitor the progress and results of the build action in the "Actions" tab of your GitHub repository.

## Deploy

**Warning: This step will incur costs in AWS. Please ensure you delete the resources afterwards if they are not required.**

To deploy the application using GitHub Actions, follow these steps:

1. Ensure you have a GitHub Actions workflow file for deployment in your repository. The file should be located at `.github/workflows/deploy.yml`.

2. Configure the deployment workflow file with the necessary steps to deploy your application. This may include building the application, running tests, and deploying to AWS.

3. Commit and push the `deploy.yml` file to your repository.

4. The deployment action will need to be triggered manually by selecting the environment.

You can monitor the progress and results of the deployment action in the "Actions" tab of your GitHub repository.
