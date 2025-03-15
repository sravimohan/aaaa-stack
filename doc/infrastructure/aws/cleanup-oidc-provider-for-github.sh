#!/bin/bash

# Variables
ROLE_NAME="GitHubAction-AssumeRoleWithAction"
OIDC_PROVIDER_URL="token.actions.githubusercontent.com"

# Get the OIDC provider ARN
OIDC_PROVIDER_ARN=$(aws iam list-open-id-connect-providers \
    --query "OpenIDConnectProviderList[?starts_with(Arn, 'arn:aws:iam::') && ends_with(Arn, '$OIDC_PROVIDER_URL')].Arn" \
    --output text)

if [ -n "$OIDC_PROVIDER_ARN" ]; then
    echo "Deleting OIDC Provider: $OIDC_PROVIDER_ARN"
    aws iam delete-open-id-connect-provider --open-id-connect-provider-arn $OIDC_PROVIDER_ARN
else
    echo "No matching OIDC provider found."
fi

# Delete IAM role
echo "Deleting IAM Role: $ROLE_NAME"
aws iam delete-role --role-name $ROLE_NAME

echo "Cleanup completed successfully."

