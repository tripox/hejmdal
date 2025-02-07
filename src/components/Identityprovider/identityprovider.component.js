/**
 * @file
 *
 */
import {log} from '../../utils/logging.util';
import {isValidCpr} from '../../utils/cpr.util';
import {
  getUniloginURL,
  validateUniloginTicket
} from '../UniLogin/unilogin.component';
import {
  getGateWayfLoginResponse,
  getGateWayfLoginUrl
} from '../GateWayf/gatewayf.component';
import {
  getListOfAgenciesForFrontend,
  getAgency
} from '../../utils/agencies.util';
import {getText, setLoginReplacersFromAgency} from '../../utils/text.util';
import buildReturnUrl from '../../utils/buildReturnUrl.util';
import _ from 'lodash';
import moment from 'moment';
import {validateUserInLibrary} from '../Borchk/borchk.component';
import * as blockLogin from '../BlockLogin/blocklogin.component';
import {ERRORS} from '../../utils/errors.util';

/**
 * Returns Identityprovider screen if user is not logged in.
 *
 * @param {object} req
 * @param {object} res
 * @param {function} next
 * @returns {*}
 */
export async function authenticate(req, res, next) {
  const state = req.getState();

  blockClientUntilTime(res, await blockLogin.toManyLoginsFromIp(req.ip));
  try {
    const identityProviders = getIdentityProviders(state);

    if (
      _.uniq(_.values(identityProviders)).length === 1 &&
      _.head(_.uniq(_.values(identityProviders))) === null
    ) {
      const serviceClient = state.serviceClient;
      log.error('The service has no valid identityproviders configured', {
        serviceClient: {
          id: serviceClient.id,
          name: serviceClient.name,
          identityProviders: serviceClient.identityProviders
        }
      });

      throw new Error('The service has no valid identityproviders configured');
    }

    if (
      req.session.query.idp &&
      state.serviceClient.identityProviders.includes(req.session.query.idp)
    ) {
      state.serviceClient.identityProviders = [req.session.query.idp];
    }
    if (
      state.serviceClient.identityProviders.length === 1 &&
      state.serviceClient.identityProviders[0] !== 'borchk'
    ) {
      res.redirect(
        identityProviders[state.serviceClient.identityProviders[0]].link
      );
      return;
    }

    let preselectedName = null;
    let preselectedId = null;
    if (req.query.presel || req.session.query.presel) {
      const preselectedLibrary = await getAgency(
        req.query.presel || req.session.query.presel
      );
      preselectedName = preselectedLibrary.agencyName;
      preselectedId = preselectedLibrary.branchId;
    }

    const branch = state.serviceAgency
      ? await getAgency(state.serviceAgency)
      : null;
    const lockedAgencyName = branch ? branch.agencyName : null;
    const lockedBranchRegistrationUrl =
      (branch && branch.registrationFormUrl) ||
      (branch && branch.branchWebsiteUrl);
    const agencyTypeFilter = req.session.query.agencytype || 'folk,forsk';
    const branches = identityProviders.borchk
      ? await getListOfAgenciesForFrontend()
      : null;
    const error = req.query.error ? req.query.error : null;
    const loginHelpReplacers = setLoginReplacersFromAgency(branch);
    const helpText = getText(
      state.serviceClient.identityProviders,
      loginHelpReplacers,
      'login_'
    );

    const identityProvidersCount = Object.values(identityProviders).filter(
      ip => ip
    ).length;

    res.render('Login', {
      retries: req.query.retries,
      error: error,
      returnUrl: buildReturnUrl(state, {error: 'LoginCancelled'}),
      serviceClient: state.serviceClient.name,
      logoColor: state.serviceClient.logoColor,
      agencyTypeFilter,
      identityProviders,
      identityProvidersCount,
      branches: branches,
      preselectedName: preselectedName,
      preselectedId: preselectedId,
      lockedAgency: state.serviceAgency || null,
      lockedAgencyName: lockedAgencyName,
      lockedBranchRegistrationUrl,
      help: helpText,
      newUser: getText(['newUser']),
      cookie: getText(['cookies']),
      privacyPolicy: getText(['privacyPolicy']),
      loginToProfile: !!req.session.loginToProfil
    });

    res.status = 200;
    req.setState({error: null});
  } catch (e) {
    const error =
      'Der opstod en fejl som skyldes forkert konfiguration af Bibliotekslogin. Kontakt gerne en administrator på dit bibliotek og gør opmærksom på fejlen.';
    const link = {
      href: '/login',
      value: 'Prøv igen'
    };
    res.render('Error', {error, link});
    log.error('Error in autheticate method', {
      error: e.message,
      stack: e.stack
    });
  }

  await next();
}

/**
 * Parses the callback parameters for borchk. Parameters from form comes as post
 *
 * @param req
 * @param res
 * @returns {*}
 */
export async function borchkCallback(req, res) {
  const requestUri = req.getState().serviceClient.borchkServiceName;
  const formData = req.fakeBorchkPost || req.body;
  const userId = formData && formData.userId ? formData.userId.trim(' ') : null;
  let validated = {error: true, message: 'unknown_error'};

  if (userId) {
    if (formData.agency && formData.pincode) {
      validated = await validateUserInLibrary(requestUri, formData);
    } else {
      validated.message = ERRORS.missing_fields;
    }
  }

  if (!validated.error) {
    await blockLogin.clearFailedUser(userId);
    const user = {
      userId: userId,
      cpr: isValidCpr(userId) ? userId : null,
      userType: 'borchk',
      agency: formData.agency,
      pincode: formData.pincode,
      userValidated: true
    };
    req.session.rememberMe = formData.rememberMe;
    req.setUser(user);
    return true;
  }
  const blockToTime = await blockLogin.toManyLoginsFromUser(userId);
  if (blockToTime) {
    validated.message = 'tmul';
    blockClientUntilTime(res, blockToTime);
  } else {
    identityProviderValidationFailed(
      req,
      res,
      validated,
      formData.agency,
      await blockLogin.getLoginsLeftUserId(userId)
    );
  }
  return false;
}

/**
 * Parses the callback parameters for unilogin.
 *
 * @param {object} req
 */
export async function uniloginCallback(req) {
  let userId = null;
  if (validateUniloginTicket(req.query)) {
    userId = req.query.user;
  } else {
    identityProviderValidationFailed(req);
  }

  req.setUser({
    userId: userId,
    userType: 'unilogin',
    uniloginId: userId
  });

  return req;
}

/**
 * Parses the callback parameters for nemlogin (via gatewayf).
 *
 * @param req
 */
export async function nemloginCallback(req) {
  const response = await getGateWayfLoginResponse(req, 'nemlogin');

  req.setUser({
    userId: response.userId,
    cpr: isValidCpr(response.userId) ? response.userId : null,
    userType: 'nemlogin'
  });

  return req;
}

/**
 * Parses the call parameters for wayf (via gatewayf)
 * @param req
 */
export async function wayfCallback(req) {
  const response = await getGateWayfLoginResponse(req, 'wayf');

  req.setUser({
    userId: response.userId || response.wayfId, // If userId ist not set we have to use wayfId as userId #190
    wayfId: response.wayfId,
    userType: 'wayf'
  });

  return req;
}
/**
 * Callback function from external identityproviders
 *
 * @param {Object} req
 * @param {Object} res
 */
export async function identityProviderCallback(req, res) {
  try {
    if (!req.getState().stateHash.includes(req.params.state)) {
      log.error('Invalid state', {params: req.params, state: req.getState()});
      res.status = 403;
      return res.send('invalid state');
    }
    switch (req.params.type) {
      case 'borchk':
        await borchkCallback(req, res);
        break;
      case 'nemlogin':
        await nemloginCallback(req);
        break;
      case 'unilogin':
        await uniloginCallback(req);
        break;
      case 'wayf':
        await wayfCallback(req);
        break;
      default:
        break;
    }
  } catch (e) {
    log.error('Error in identityProviderCallback', {
      error: e.message,
      stack: e.stack,
      params: req.params,
      state: req.getState()
    });

    identityProviderValidationFailed(req, res, ERRORS.error_in_request);
  }
  if (res.headersSent) {
    return; // Something went wrong, and redirect is initiated.
  }
  await blockLogin.clearFailedIp(req.ip);
  req.session.save(() => {
    if (req.session.hasOwnProperty('query')) {
      return res.redirect(
        `/oauth/authorize/?${Object.entries(req.session.query)
          .map(([key, value]) => `${key}=${value}`)
          .join('&')}`
      );
    }
    // If not do whatever you fancy
    res.redirect('/');
  });
}

/**
 *
 * @param {object} req
 * @param {object} res
 * @param {object} error
 * @param {string} agency
 * @param loginsLeft number
 */
function identityProviderValidationFailed(req, res, error, agency, loginsLeft) {
  const agencyParameter = req.getState().serviceAgency
    ? '&agency=' + req.getState().serviceAgency
    : '';
  const errorParameter = error.error ? `&error=${error.message}` : '';
  const preselectedLibrary = agency ? `&presel=${agency}` : '';
  const retries = loginsLeft ? `&retries=${loginsLeft}` : '';
  const startOver = `/login?token=${req.getState().smaugToken}&returnurl=${
    req.getState().returnUrl
  }${agencyParameter}${errorParameter}${preselectedLibrary}${retries}`;
  res.redirect(302, startOver);
}

/**
 *
 * @param {object} state
 * @return {object}
 */
function getIdentityProviders(state) {
  const stateHash = state.stateHash[state.stateHash.length - 1];
  const identityProviders = state.serviceClient.identityProviders;
  let providers = {
    borchk: null,
    unilogin: null,
    nemlogin: null,
    wayf: null
  };

  if (identityProviders.includes('borchk')) {
    providers.borchk = {
      action: `/login/identityProviderCallback/borchk/${stateHash}`,
      abortAction: buildReturnUrl(state, {error: 'LoginCancelled'})
    };
  }

  if (identityProviders.includes('unilogin')) {
    providers.unilogin = {
      link: getUniloginURL(stateHash)
    };
  }

  if (identityProviders.includes('nemlogin')) {
    providers.nemlogin = {
      link: getGateWayfLoginUrl('nemlogin', stateHash)
    };
  }

  if (identityProviders.includes('wayf')) {
    providers.wayf = {
      link: getGateWayfLoginUrl('wayf', stateHash)
    };
  }

  return providers;
}

/**
 * Check if user is logged in with a valid serviceProvider
 *
 * TODO: Should this be implementet in the authorize endpoint?
 *
 * @param req
 * @returns {boolean}
 */
export default function userIsLoggedIn(req) {
  const ips = isLoggedInWith(req);
  if (ips.length) {
    if (!ips.includes('borck')) {
      const link = getIdentityProviders(req.getState())[ips[0]].link;
      req.redirect(link);
    }
    return true;
  }
  return false;
}

/**
 * Show blocked page
 *
 * @param res
 * @param blockToTime
 */
function blockClientUntilTime(res, blockToTime) {
  const now = new Date();
  const blocked = blockToTime ? new Date(blockToTime) : now;
  if (blocked > now) {
    const blockMinutes = Math.ceil((blocked.getTime() - now.getTime()) / 60000);
    const minutesTxt =
      'Login blokeret i ' +
      blockMinutes +
      ' minut' +
      (blockMinutes !== 1 ? 'ter.' : '.');
    const toTxt =
      ' Indtil ' +
      moment(blocked)
        .local()
        .format('D MMMM Y H:mm:ss');
    res.status(429);
    res.render('Blocked', {error: minutesTxt});
  }
}

/**
 * Returns the valid identityproviders a user is logged in with.
 *
 * @param req
 * @returns {array}
 */
function isLoggedInWith(req) {
  if (!req.hasUser()) {
    return [];
  }
  const identityProviders = req.getState().serviceClient.identityProviders;
  return req
    .getUser()
    .identityProviders.filter(ip => identityProviders.includes(ip));
}
