export const environment = {
  production: false,
  msalConfig: {
    auth: {
      clientId: '218d509f-21ca-4cf7-93ad-badb35628171',
      authority: 'https://login.microsoftonline.com/c512e30b-c327-43a9-9340-0d49119c380a', // tenant-specific authority
    },
  },
  graphApiConfig: {
    scopes: ['user.read'],
    uri: 'https://graph.microsoft.com/v1.0/me',
  },
  weatherApiConfig: {
    scopes: ['api://355beb58-8fa3-44ba-a691-0296f1dd0c60/Forecast.Read'], // need the fully qulified scope for getting permissions to the secondary app in azure ad
    uri: 'https://localhost:50466',
  },
};
