const wrapMeteorClientMethod = (Meteor, AccountsClient, meteorMethod) => {
  const originalCall = Meteor[meteorMethod];

  Meteor[meteorMethod] = async (name, ...args) => {
    const { accessToken } = await AccountsClient.tokens();

    return originalCall.apply(Meteor, [name, accessToken || null, ...(args || [])]);
  }
};

export const wrapMeteorClient = (Meteor, AccountsClient) => {
  wrapMeteorClientMethod(Meteor, AccountsClient, 'call');
  wrapMeteorClientMethod(Meteor, AccountsClient, 'subscribe');
};
