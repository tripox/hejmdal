import passport from 'passport';
import {Strategy} from 'passport-oauth2';
import {CONFIG} from '../utils/config.util';

const exampleStrategy = new Strategy(
  {
    authorizationURL: 'http://localhost:3010/oauth/authorize',
    tokenURL: 'http://localhost:3010/oauth/token',
    clientID: 'foo',
    clientSecret: 'nightworld',
    callbackURL: 'http://localhost:3010/example/provider/callback'
  },
  function(token, tokenSecret, profile, done) {
    done(null, profile.id);
  }
);

exampleStrategy.authorizationParams = function() {
  return {
    APIName: 'OpenApiActivity'
  };
};

const profileStrategy = new Strategy(
  {
    authorizationURL: CONFIG.app.host + '/oauth/authorize',
    tokenURL: CONFIG.app.host + '/oauth/token',
    clientID: CONFIG.smaug.hejmdalClientId,
    clientSecret: 'foo',
    callbackURL: CONFIG.app.host + '/profile/provider/callback'
  },
  function(token, tokenSecret, profile, done) {
    done(null, token);
  }

);


passport.use('example', exampleStrategy);
passport.use('profile', profileStrategy);

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(userId, done) {
  done(null, {id: userId});
});

export default app => {
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/example', (req, res) => {
    res.send(`
        <html>
        <body>
        <a href="/example/provider">Log In with OAuth Provider</a>
        </body>  
        </html>
    `);
  });
  // Redirect the user to the OAuth provider for authentication.  When
  // complete, the provider will redirect the user back to the application at
  //     /auth/provider/callback
  app.get('/example/provider', passport.authenticate('example'));

  // The OAuth provider has redirected the user back to the application.
  // Finish the authentication process by attempting to obtain an access
  // token.  If authorization was granted, the user will be logged in.
  // Otherwise, authentication has failed.
  app.get(
    '/example/provider/callback',
    passport.authenticate('provider', {
    }),
    (req, res) => { //eslint-disable-line
      // Login was succesful. What to do.
    }
  );
};
