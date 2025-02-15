import { once } from 'patronum';
import { createEvent, sample, createStore } from 'effector';

import type { Account, Wallet } from '@shared/core';
import { walletModel, accountUtils, walletUtils } from '@entities/wallet';
import { priceProviderModel } from '@entities/price';
import { portfolioModel, assetsSettingsModel, assetsSearchModel } from '@features/assets';

const activeShardsSet = createEvent<Account[]>();

const $activeShards = createStore<Account[]>([]);

sample({
  clock: [assetsSettingsModel.$assetsView, once(assetsSettingsModel.events.assetsStarted)],
  source: assetsSettingsModel.$assetsView,
  target: portfolioModel.events.activeViewChanged,
});

sample({
  clock: assetsSettingsModel.$hideZeroBalances,
  target: portfolioModel.events.hideZeroBalancesChanged,
});

sample({
  clock: assetsSearchModel.$query,
  target: portfolioModel.events.queryChanged,
});

sample({
  clock: assetsSettingsModel.events.assetsStarted,
  fn: () => ({ includeRates: true }),
  target: priceProviderModel.events.assetsPricesRequested,
});

sample({
  clock: activeShardsSet,
  source: walletModel.$activeWallet,
  filter: (wallet: Wallet | undefined): wallet is Wallet => Boolean(wallet),
  fn: (wallet, accounts) => {
    if (!walletUtils.isPolkadotVault(wallet)) return accounts;

    return accounts.filter((account) => !accountUtils.isBaseAccount(account));
  },
  target: $activeShards,
});

sample({
  clock: walletModel.$activeWallet,
  filter: (wallet: Wallet | undefined): wallet is Wallet => Boolean(wallet),
  fn: (wallet) => {
    if (!walletUtils.isPolkadotVault(wallet)) return wallet.accounts;

    return wallet.accounts.filter((account) => !accountUtils.isBaseAccount(account));
  },
  target: $activeShards,
});

sample({
  clock: $activeShards,
  target: portfolioModel.events.accountsChanged,
});

export const assetsModel = {
  $activeShards,
  events: {
    activeShardsSet,
  },
};
