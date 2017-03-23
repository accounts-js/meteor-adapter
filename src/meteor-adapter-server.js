const extendMethodWithFiber = (method, ServerValidator, Meteor, overrideMeteorUser) => {
  return function (accessToken, ...args) {
    let meteorContext = this;
    let user;

    if (accessToken === null) {
      user = null;
    } else {
      const method = Meteor.wrapAsync(function (accessToken, callback) {
        ServerValidator.validateToken(accessToken, meteorContext)
          .then(user => {
            callback(null, user);
          })
          .catch(e => {
            callback(e, null);
          })
      });

      user = method(accessToken);
    }

    const jsaccountsContext = {
      userId: user ? user.id : null,
      user: user || null,
      accessToken,
    };

    if (overrideMeteorUser) {
      Meteor.jsaccountsContext = jsaccountsContext;
      Meteor.user = () => jsaccountsContext.user;
      Meteor.userId = () => jsaccountsContext.userId;
    } else {
      this.jsaccountsContext = jsaccountsContext;      
      this.user = jsaccountsContext.user;
      this.userId = jsaccountsContext.userId;
    }

    return method.apply(this, [...(args || [])]);
  };
};

const wrapMeteorPublish = (Meteor, ServerValidator) => {
  const originalMeteorPublish = Meteor.publish;

  Meteor.publish = (publicationName, func) => {
    const newFunc = extendMethodWithFiber(func, ServerValidator, Meteor, false);

    return originalMeteorPublish.apply(Meteor, [publicationName, newFunc]);
  };
};

const wrapMeteorMethods = (Meteor, ServerValidator) => {
  const originalMeteorMethod = Meteor.methods;

  Meteor.methods = (methodsObject, ...args) => {
    const modifiedArgs = Object.keys(methodsObject).map(methodName => {
      const originalMethod = methodsObject[methodName];

      return {
        name: methodName,
        method: extendMethodWithFiber(originalMethod, ServerValidator, Meteor, true),
      };
    });

    const argsAsObject = modifiedArgs.reduce((a, b) => Object.assign(a, {
      [b.name]: b.method
    }), {});

    return originalMeteorMethod.apply(Meteor, [argsAsObject, ...(args || [])]);
  }
};

export const wrapMeteorServer = (Meteor, Accounts, ServerValidator) => {
  wrapMeteorMethods(Meteor, ServerValidator);
  wrapMeteorPublish(Meteor, ServerValidator);

  Meteor.methods({
    'jsaccounts/validateLogout': function() {
      const connection = this.connection;

      Meteor._noYieldsAllowed(function () {
        Accounts._removeTokenFromConnection(connection.id);
        Accounts._setAccountData(connection.id, 'loginToken', null);
      });

      this.setUserId(null);
    },
    'jsaccounts/validateLogin': function () {
      const connection = this.connection;
      const jsaccountsContext = Meteor.jsaccountsContext || {};
      
      Meteor._noYieldsAllowed(function () {
        Accounts._removeTokenFromConnection(connection.id);
        Accounts._setAccountData(connection.id, 'loginToken', jsaccountsContext.accessToken);
      });

      this.setUserId(jsaccountsContext.userId);

      return true;      
    },
  });
};