/* eslint-disable no-undefined */
import {assert} from 'chai';
import {CONFIG} from '../../../utils/config.util';
import {libraryListFromName, libraryListFromPosition} from '../openAgency.client';

describe('Test openAgency component', () => {

  const _SAVE_CONFIG = CONFIG.mock_externals.openAgency;
  beforeEach(() => {
    CONFIG.mock_externals.openAgency = true;
  });

  afterEach(() => {
    CONFIG.mock_externals.openAgency = _SAVE_CONFIG;
  });

  it('Lookup a library from name', async() => {
    const list = [
      {
        agencyId: '761500',
        branchId: '761500',
        agencyName: 'Horsens Bibliotek',
        branchName: 'Horsens Bibliotek',
        branchShortName: 'Horsens Bibliotek',
        city: 'Horsens',
        address: 'Tobaksgården 12Postbox 521',
        type: 'Folkebibliotek',
        registrationFormUrl: '',
        registrationFormUrlText: '',
        branchEmail: 'bibliotek@horsens.dk',
        distance: ''
      },
      {
        agencyId: '860970',
        branchId: '860970',
        agencyName: 'Horsens Gymnasium, Biblioteket',
        branchName: 'Horsens Gymnasium, Biblioteket',
        branchShortName: '',
        city: '',
        address: '',
        type: 'Forskningsbibliotek',
        registrationFormUrl: '',
        registrationFormUrlText: '',
        branchEmail: undefined
      },
      {
        agencyId: '874540',
        branchId: '874540',
        agencyName: 'Horsens Statsskole, Biblioteket',
        branchName: 'Horsens Statsskole, Biblioteket',
        branchShortName: '',
        city: '',
        address: '',
        type: 'Forskningsbibliotek',
        registrationFormUrl: '',
        registrationFormUrlText: '',
        branchEmail: undefined
      },
      {
        agencyId: '861340',
        branchId: '861340',
        agencyName: 'Learnmark Horsens',
        branchName: 'Learnmark Horsens',
        branchShortName: '',
        city: ' ',
        address: ' ',
        type: 'Forskningsbibliotek',
        registrationFormUrl: '',
        registrationFormUrlText: '',
        branchEmail: undefined
      }];

    assert.deepEqual(list, await libraryListFromName('horsen?'));
  });

  it('Lookup a library from position', async() => {
    const list = [
      {
        agencyId: '715100',
        branchId: '715100',
        agencyName: '',
        branchName: 'Ballerup Bibliotek',
        branchShortName: '',
        city: '',
        address: 'Hovedbiblioteket Banegårdspladsen 1',
        type: 'Folkebibliotek',
        registrationFormUrl: '',
        registrationFormUrlText: '',
        branchEmail: '',
        distance: '1237'
      },
      {
        agencyId: '724000',
        branchId: '724000',
        agencyName: '',
        branchName: 'Smørum Bibliotek',
        branchShortName: '',
        city: '',
        address: 'Flodvej 68 Smørumnedre',
        type: 'Folkebibliotek',
        registrationFormUrl: '',
        registrationFormUrlText: '',
        branchEmail: '',
        distance: '2905'
      }];

    assert.deepEqual(list, await libraryListFromPosition('55.72', '12.35'));
  });

  it('Lookup a library not there', async() => {
    const empty = [];
    assert.deepEqual(empty, await libraryListFromName('notFound'));
  });
});
