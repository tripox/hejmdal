/**
 * @file
 *
 *  Maps data from CULR (and IDprovider) as specified by the Smaug-setting for the given serviceClient
 *
 */

import {log} from './logging.util';
import {mapFromCpr} from './cpr.util';
import {getInstitutionsForUser} from '../components/UniLogin/unilogin.component';

/**
 * Attribute mapper
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
export default async function mapAttributesToTicket(req, res, next) {
  const state = req.getState();
  const user = req.getUser();

  if (state && state.serviceClient && state.culr) {
    const serviceAttributes = state.serviceClient.attributes;
    const culr = state.culr;
    const ticketAttributes = await mapCulrResponse(
      culr,
      serviceAttributes,
      user,
      state.serviceClient.id
    );
    req.setState({ticket: {attributes: ticketAttributes}});
  }

  await next();
}

/**
 * Maps the response from CULR according to the given array of fields
 *
 * @param {object} culr The CULR reponse object
 * @param {object} attributes The attributes object defined in Smaug
 * @param {object} user data returned by the idp
 * @param {string} serviceId string
 * @see ATTRIBUTES
 * @return {object}
 */
export async function mapCulrResponse(culr, attributes, user) {
  let mapped = {};
  let cpr = user.cpr || null;
  let agencies = [];
  let fromCpr = {};

  if (culr.accounts && Array.isArray(culr.accounts)) {
    culr.accounts.forEach(account => {
      if (account.userIdType === 'CPR' && !cpr) {
        cpr = account.userIdValue;
      }

      agencies.push({
        agencyId: account.provider,
        userId: account.userIdValue,
        userIdType: account.userIdType
      });
    });
  } else if (cpr && user.agency) {
    agencies.push({
      agencyId: user.agency,
      userId: cpr,
      userIdType: 'CPR'
    });
  }

  if (cpr) {
    fromCpr = mapFromCpr(cpr);
  }

  const fields = Object.keys(attributes);
  await Promise.all(
    fields.map(async field => {
      try {
        switch (field) {
          case 'birthDate':
          case 'birthYear':
          case 'gender':
            mapped[field] = fromCpr[field] || null;
            break;
          case 'cpr':
            mapped.cpr = cpr;
            break;
          case 'agencies':
          case 'libraries':
            mapped.agencies = agencies;
            break;
          case 'municipality':
            mapped.municipality = culr.municipalityNumber || null;
            break;
          case 'municipalityAgencyId':
            mapped.municipalityAgencyId = culr.municipalityAgencyId || null;
            break;
          case 'uniloginId':
            mapped.uniloginId = user.uniloginId || null;
            break;
          case 'userId':
            mapped.userId = user.userId;
            break;
          case 'wayfId':
            mapped.wayfId = user.wayfId ? user.wayfId : null;
            break;
          case 'uniqueId':
            mapped.uniqueId = culr.culrId;
            break;
          case 'uniLoginInstitutions': {
            mapped.uniLoginInstitutions =
              (user.uniloginId &&
                (await getInstitutionsForUser(user.uniloginId))) ||
              [];
            break;
          }
          default:
            log.warn('Cannot map attribute: ' + field);
            break;
        }
      } catch (error) {
        log.error('Failed to map attribute: ' + field, {
          error: error.message,
          stack: error.stack
        });
      }
    })
  );

  return mapped;
}
