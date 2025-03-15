# Configuring OpenID Connect in AWS

## Overview

OpenID Connect (OIDC) allows your GitHub Actions workflows to access resources in Amazon Web Services (AWS), without needing to store the AWS credentials as long-lived GitHub secrets.

## Steps

### 1. Create an OIDC provider in AWS

This is a trust relationship that allows GitHub to authenticate and be authorized to perform actions in your account.






- Create an IAM role in your account. You will then scope the IAM role’s trust relationship to the intended parts of your GitHub organization, repository, and branch for GitHub to assume and perform specific actions.

- Assign a minimum level of permissions to the role.

- Create a GitHub Actions workflow file in your repository that can invoke actions in your account.
Audit the role’s use with Amazon CloudTrail logs.


## Documentation

- [Configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

- [Use IAM roles to connect GitHub Actions to actions in AWS](https://aws.amazon.com/blogs/security/use-iam-roles-to-connect-github-actions-to-actions-in-aws/)
