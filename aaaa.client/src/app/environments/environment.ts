export const environment = {
    production: false,
    msalConfig: {
        auth: {
            clientId: '3ee33b6d-71ee-4a14-ab6a-6858f3a4e51b',
            authority: 'https://login.microsoftonline.com/c512e30b-c327-43a9-9340-0d49119c380a',
        }
    },
    apiConfig: {
        scopes: ['user.read'],
        uri: 'https://graph.microsoft.com/v1.0/me',
    },
}
