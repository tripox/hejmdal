/**
 * @file
 *
 * Mock answer from WAYF (through gatewayf) and NEMlog-IN (through gatewayf)
 *
 * ... and mock the URL to return directly to hejmdal
 *
 */
const mockNemloginOk = {
  mail: [],
  schacPersonalUniqueID: ['urn:mace:terena.org:schac:personalUniqueID:dk:CPR:0102030405'],
  eduPersonTargetedID: ['WAYF-DK-some-long-md5-like-string'],
  groups: {
    users: [],
    members: []
  }
};
const mockWayfOk = {
  mail: [],
  schacPersonalUniqueID: ['urn:mace:terena.org:schac:personalUniqueID:dk:CPR:0102030405'],
  eduPersonTargetedID: ['WAYF-DK-some-other-md5-like-string'],
  groups: {
    users: [],
    members: []
  }
};

export function getMockedGateWayfResponse(idp) {
  return idp === 'nemlogin' ? mockNemloginOk : mockWayfOk;
}

export function getMockedGateWayfUrl(version, idp, token) {
  return `${version}/login/identityProviderCallback/${idp}/${token}`;
}
