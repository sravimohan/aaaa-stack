# Getting Started

## Get the Code

To get the code, you can clone the repository using the following command:

```bash
git clone https://github.com/sravimohan/aaaa-stack.git
```

## Azure AD (Entra ID)

To set up Azure AD Apps, scopes, and roles, please refer to [Azure AD setup instructions](azure-ad.md).

## Angular Front-End

This sample is already set up with the Azure AD configuration and HTTP client interceptor. You will need to configure the Azure AD Client ID, Tenant ID, and your API URLs.

For detailed instructions, please refer to [Angular Front-End instructions](../aaaa.client/README.md).

## ASP.NET Web API Back-End

The back-end of this sample is built using ASP.NET Web API. It is configured to work with Azure AD for authentication and authorization.

For detailed instructions, please refer to [ASP.NET Web API Back-End instructions](../AAAA.Server/README.md).

## Build and Deploy

**Warning: This step will incur costs in AWS. Please ensure you delete the resources afterward if they are not required.**

For detailed instructions, please refer to [Build and Deploy](/aaaa-stack/aws/github-actions-infrastructure.html)
