const extendMethodWithFiber = (method, AccountsServer, Meteor, overrideMeteorUser) => {
  return function(accessToken, ...args) {
    let user;

    if (accessToken === null) {
      user = null;
    }
    else {
      const method = Meteor.wrapAsync(function (accessToken, callback) {
        AccountsServer.resumeSession(accessToken)
          .then(user => {
            callback(null, user);
          })
          .catch(e => {
            callback(e, null);
          })
      });

      user = method(accessToken);
    }

    if (overrideMeteorUser) {
      Meteor.user = () => user || null;
      Meteor.userId = () => user ? user.id : null;
    }
    else {
      this.user = user | null;
      this.userId = user ? user.id : null;
    }

    return method.apply(this, [...(args || [])]);
  };
};

const wrapMeteorPublish = (Meteor, AccountsServer) => {
  const originalMeteorPublish = Meteor.publish;

  Meteor.publish = (publicationName, func) => {
    const newFunc = extendMethodWithFiber(func, AccountsServer, Meteor, false);

    return originalMeteorPublish.apply(Meteor, [publicationName, newFunc]);
  };
};

const wrapMeteorMethods = (Meteor, AccountsServer) => {
  const originalMeteorMethod = Meteor.methods;

  Meteor.methods = (methodsObject, ...args) => {
    const modifiedArgs = Object.keys(methodsObject).map(methodName => {
      const originalMethod = methodsObject[methodName];

      return {
        name: methodName,
        method: extendMethodWithFiber(originalMethod, AccountsServer, Meteor, true),
      };
    });

    const argsAsObject = modifiedArgs.reduce((a, b) => Object.assign(a, { [b.name]: b.method }), {});

    return originalMeteorMethod.apply(Meteor, [argsAsObject, ...(args || [])]);
  }
};

export const wrapMeteorServer = (Meteor, Accounts, AccountsServer) => {
  wrapMeteorMethods(Meteor, AccountsServer);
  wrapMeteorPublish(Meteor, AccountsServer);

  Meteor.publish('jsaccounts.currentUser', function() {
    if (!this.userId) {
      return null;
    }
    
    return Meteor.users.find({_id: this.userId});
  })
};
