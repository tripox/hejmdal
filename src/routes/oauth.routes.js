import {
  validateAuthRequest,
  disableRedirectUrlCheck,
  isUserLoggedIn,
  authorizationMiddleware
} from '../utils/oauth2.utils';
import {Router} from 'express';
import {retrieveMissingUserConsent} from '../components/Consent/consent.component';
import {setDefaultState} from '../middlewares/state.middleware';

const router = Router();

/**
 * authorization
 * GET request:
 * - response_type=code - Indicates that your server expects to receive an authorization code
 * - client_id - The client ID you received when you first created the application
 * - redirect_uri - Indicates the URI to return the user to after authorization is complete
 * - scope - One or more scope values indicating which parts of the user's account you wish to access
 * - state - A random string generated by your application, which you'll verify later
 * verifies redirect_uri against client_id
 * response:
 * redirects to redirect_uri and adds authorizationCode in code and state from request is echoed back
 *
 */
router.get(
  '/authorize',
  disableRedirectUrlCheck,
  validateAuthRequest,
  isUserLoggedIn,
  setDefaultState,
  retrieveMissingUserConsent,
  authorizationMiddleware
);

/**
 * token.
 * POST request:
 * - grant_type=authorization_code - The grant type for this flow is authorization_code
 * - code=AUTH_CODE_HERE - This is the code you received in the query string
 * - redirect_uri=REDIRECT_URI - Must be identical to the redirect URI provided in the original link
 * - client_id=CLIENT_ID - The client ID you received when you first created the application
 * - client_secret=CLIENT_SECRET - Since this request is made from server-side code, the secret is included
 * Response:
 * { "access_token":"RsT5OjbzRn430zqMLgV3Ia", "expires_in":3600 }
 * or
 * { "error":"invalid_request" }
 *
 */
router.post('/token', (req, res, next) => {
  req.app.oauth.token()(req, res, next);
});

export default router;
