/**
 * @file
 *
 * Functions to retrieve attributes in a ticket.
 */

import PersistentUserStorage from '../../models/User/user.persistent.storage.model';
import {getUserAttributesFromCulr} from '../Culr/culr.component';
import {mapCulrResponse} from '../../utils/attribute.mapper.util';
import {getClientById} from '../Smaug/smaug.client';
import {log} from '../../utils/logging.util';
import KeyValueStorage from '../../models/keyvalue.storage.model';
import MemoryStorage from '../../models/memory.storage.model';
import {CONFIG} from '../../utils/config.util';
import {createHash} from '../../utils/hash.utils';

const storage = CONFIG.mock_storage ?
  new KeyValueStorage(new MemoryStorage()) :
  new KeyValueStorage(new PersistentUserStorage());

/**
 * Fetch an attribute object from storage from the identifier and token.
 *
 * @param req
 * @param res
 */
export async function getUser(req, res, next) {
  const {user, client: clientId} = res.locals.oauth.token;
  try {
    const [culrAttributes, client] = await Promise.all([
      getUserAttributesFromCulr(user.userId),
      getClientById(clientId)
    ]);
    const ticketAttributes = mapCulrResponse(
      culrAttributes,
      client.attributes,
      user,
      clientId
    );
    res.json(ticketAttributes);
  } catch (error) {
    log.error('Could not generate user info', {error});
    next();
  }
}

/**
 * Get user from storage.
 *
 * @param {String} token
 */
export async function readUser(token) {
  const hashedToken = createHash(token);
  return await storage.read(hashedToken);
}

/**
 * Save user to storage.
 *
 * @param {Object} user
 */
export async function saveUser(token, user) {
  const hashedToken = createHash(token);
  storage.update(hashedToken, user);
}

/**
 * Delete user from storage.
 *
 * @param {String} token
 */
export async function deleteuser(token) {
  const hashedToken = createHash(token);
  storage.delete(hashedToken);
}
