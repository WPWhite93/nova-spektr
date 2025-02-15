import { createStore, createEvent, createEffect, restore, sample, combine } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { spread } from 'patronum';
import { isEmpty } from 'lodash';

import { ReferendumInfo, ChainId, TrackId, Voting, ReferendumId } from '@shared/core';
import { IGovernanceApi, governanceService, subsquareService } from '@shared/api/governance';
import { networkModel } from '@entities/network';

const chainIdChanged = createEvent<ChainId>();
const governanceApiChanged = createEvent<IGovernanceApi>();
const referendumSelected = createEvent<string>();
const referendumWithChainSelected = createEvent<{ chainId: ChainId; index: string }>();

const $chainId = restore(chainIdChanged, null);
const $governanceApi = restore(governanceApiChanged, subsquareService);

const $referendumsMap = createStore<Record<ReferendumId, ReferendumInfo>>({});
const $referendumsDetails = createStore<Record<string, string> | null>(null);
const $referendumsRequested = createStore<boolean>(false).reset(chainIdChanged);

const requestOnChainReferendumsFx = createEffect((api: ApiPromise): Promise<Record<ReferendumId, ReferendumInfo>> => {
  return governanceService.getReferendums(api);
});

type OffChainParams = {
  chainId: ChainId;
  service: IGovernanceApi;
};
const requestOffChainReferendumsFx = createEffect(
  ({ chainId, service }: OffChainParams): Promise<Record<string, string>> => {
    return service.getReferendumList(chainId);
  },
);

const getVotesFx = createEffect((api: ApiPromise): Promise<Record<TrackId, Voting>> => {
  return governanceService.getVotingFor(api, '12mP4sjCfKbDyMRAEyLpkeHeoYtS5USY4x34n9NMwQrcEyoh');
  // return governanceService.getVotingFor(api, '153YD8ZHD9dRh82U419bSCB5SzWhbdAFzjj4NtA5pMazR2yC');
});

const $api = combine(
  {
    chainId: $chainId,
    apis: networkModel.$apis,
  },
  ({ chainId, apis }) => {
    return (chainId && apis[chainId]) || null;
  },
);

sample({
  clock: $api.updates,
  source: $referendumsRequested,
  filter: (referendumsRequested, api) => !referendumsRequested && Boolean(api),
  fn: (_, api) => api!,
  target: requestOnChainReferendumsFx,
});

sample({
  clock: requestOnChainReferendumsFx.doneData,
  fn: (referendums) => ({ referendums, requested: true }),
  target: spread({
    referendums: $referendumsMap,
    requested: $referendumsRequested,
  }),
});

sample({
  clock: requestOnChainReferendumsFx.doneData,
  source: {
    chainId: $chainId,
    referendums: $referendumsMap,
    service: $governanceApi,
  },
  filter: ({ chainId, referendums, service }) => {
    return Boolean(chainId) && !isEmpty(referendums) && Boolean(service);
  },
  fn: ({ chainId, service }) => {
    return { chainId: chainId!, service: service! };
  },
  target: requestOffChainReferendumsFx,
});

sample({
  clock: requestOffChainReferendumsFx.doneData,
  filter: (referendums) => !isEmpty(referendums),
  target: $referendumsDetails,
});

sample({
  clock: requestOnChainReferendumsFx.doneData,
  source: $api,
  fn: (api) => api!,
  target: getVotesFx,
});

sample({
  clock: referendumSelected,
  source: $chainId,
  filter: (chainId: ChainId | null): chainId is ChainId => Boolean(chainId),
  fn: (chainId, index) => ({ chainId, index }),
  target: referendumWithChainSelected,
});

export const referendumListModel = {
  $referendumsMap,
  $referendumsDetails,

  events: {
    chainIdChanged,
    governanceApiChanged,
    referendumSelected,
  },
  output: {
    referendumSelected: referendumWithChainSelected,
  },
};
