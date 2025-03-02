# AAAA Client

## Set up Azure AD for Angular Client

- Quickstart: Register an application with the Microsoft identity platform [MSAL Angular Initialization Guide](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-angular/docs/initialization.md).

- [Redirect URI: MSAL.js 2.0 with auth code flow] (<https://learn.microsoft.com/en-gb/entra/identity-platform/scenario-spa-app-registration#redirect-uri-msaljs-20-with-auth-code-flow>)

- <https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-angular-samples/angular-standalone-sample>

## Set up Azure AD for ASP.NET Web Api

- (<https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-web-api-dotnet-register-app>)

## Steps for setting up Azure AD

- create api app
  - expose and api, add scope, Forecast.Read
  - enterprise applications, client, Permissions, Grant admin consent for org

- create client app
  - SPA with redirect url
  - api permissions, request api permission, choosee api app and persmission
  - enterprise applications, api, Permissions, Grant admin consent for org

- In client app
  - api permissions, add a permission, select api app and scope
