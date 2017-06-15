export const wrapMeteorServer = (Meteor, Accounts, ServerValidator) => {
  Meteor.methods({
    'jsaccounts/validateLogout': function () {
      const connection = this.connection;

      if (Accounts) {
        Meteor._noYieldsAllowed(function () {
          Accounts._removeTokenFromConnection(connection.id);
          Accounts._setAccountData(connection.id, 'loginToken', null);
        });
      }

      this.setUserId(null);
    },
    'jsaccounts/validateLogin': function (accessToken) {
      const connection = this.connection;
      const meteorContext = this;

      const method = Meteor.wrapAsync(function (accessToken, callback) {
        ServerValidator.validateToken(accessToken, meteorContext)
          .then(user => {
            callback(null, user);
          })
          .catch(e => {
            callback(e, null);
          })
      });

      const user = method(accessToken);
      const jsaccountsContext = {
        userId: user ? user.id : null,
        user: user || null,
        accessToken,
      };

      if (Accounts)  {
        Meteor._noYieldsAllowed(function () {
          Accounts._removeTokenFromConnection(connection.id);
          Accounts._setAccountData(connection.id, 'loginToken', jsaccountsContext.accessToken);
        });
      }

      this.setUserId(jsaccountsContext.userId);

      return true;
    },
  });
};
