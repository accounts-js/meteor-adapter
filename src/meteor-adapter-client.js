const wrapMeteorClientMethod = (Meteor, AccountsClient, meteorMethod) => {
  const originalCall = Meteor[meteorMethod];

  Meteor[meteorMethod] = (name, ...args) => {
    const { accessToken } = AccountsClient.tokens();

    return originalCall.apply(Meteor, [name, accessToken || null, ...(args || [])]);
  }
};

const replaceMethod = (source, dest, callbackify, argumentsTransformation, returnValueTransformation) => {
  argumentsTransformation = argumentsTransformation || (args => args);
  returnValueTransformation = returnValueTransformation || (retVal => retVal);

  source.obj[source.method] = (...args) => {
    const methodWithContext = dest.obj[dest.method].bind(dest.obj);
    let baseRet, catchedErr;

    try {
      baseRet = methodWithContext(...(argumentsTransformation(args)));
    }
    catch (e) {
      catchedErr = e;
    }

    const isPromise = baseRet instanceof Promise;
    const ret = isPromise ? baseRet.then(res => returnValueTransformation(res)) : returnValueTransformation(baseRet);

    if (callbackify && args && args[args.length - 1] && typeof args[args.length - 1] === 'function') {
      const callback = args[args.length - 1];

      if (isPromise) {
        ret
          .then(result => {
            callback(null, result);
          })
          .catch(e => {
            callback(e, null);
          });
      }
      else {
        if (catchedErr) {
          callback(catchedErr, null);
        }
        else {
          callback(null, baseRet);
        }
      }
    }
    else {
      if (catchedErr && !callbackify) {
        throw catchedErr;
      }
    }
  };
};

export const wrapMeteorClient = (Meteor, Accounts, AccountsClient) => {
  wrapMeteorClientMethod(Meteor, AccountsClient, 'call');
  wrapMeteorClientMethod(Meteor, AccountsClient, 'subscribe');
  replaceMethod(
    {
      obj: Meteor,
      method: 'loginWithPassword',
    },
    {
      obj: AccountsClient,
      method: 'loginWithPassword',
    },
    true
  );
  replaceMethod(
    {
      obj: Meteor,
      method: 'logout',
    },
    {
      obj: AccountsClient,
      method: 'logout',
    });
  replaceMethod(
    {
      obj: Accounts,
      method: '_storedLoginToken',
    },
    {
      obj: AccountsClient,
      method: 'tokens',
    },
    false,
    null,
    (result) => result.accessToken || undefined);
};
