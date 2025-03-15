#!/bin/bash

# Pre-requisites:
# Install AWS CLI and Configure AWS CLI with the necessary permissions.
# Alternatively, you can login to your AWS console and use CloudShell.

# Prepare script:
# Replace the variables with your values
#   <AWS_ACCOUNT_ID> with your AWS account ID
#   <GitHub_Organization> with the GitHub organization name
#   <Branch> with the branch name you want to use
#   <Repository> with the GitHub repository name

# Run the script is bash
#   sh create-oidc-provider-for-github.sh

# Clean up (Optional):
# sh cleanup-oidc-provider-for-github.sh

# Account Variables (Replace with your values)
AWS_ACCOUNT_ID="<AWS_ACCOUNT_ID>"
GITHUB_ORG="<GitHub_Organization>"
REPOSITORY="<Repository>"
BRANCH="<Branch>"

# Variables
OIDC_URL="https://token.actions.githubusercontent.com"
THUMBPRINT="6938fd4d98bab03faadb97b34396831e3780aea1"
AUDIENCE="sts.amazonaws.com"
ROLE_NAME="GitHubAction-AssumeRoleWithAction"
POLICY_FILE="trust-policy-for-github-oidc.json"

# Create OIDC Provider
aws iam create-open-id-connect-provider \
    --url $OIDC_URL \
    --thumbprint-list $THUMBPRINT \
    --client-id-list $AUDIENCE

# Create Trust Policy JSON file
cat <<EOL >$POLICY_FILE
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::$AWS_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:sub": "repo:$GITHUB_ORG/$REPOSITORY:ref:refs/heads/$BRANCH",
                    "token.actions.githubusercontent.com:sub": "repo:$GITHUB_ORG/$REPOSITORY:pull_request",
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                }
            }
        }
    ]
}
EOL

# Create IAM Role
aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file://$POLICY_FILE

echo "OIDC Provider and IAM Role created successfully."
