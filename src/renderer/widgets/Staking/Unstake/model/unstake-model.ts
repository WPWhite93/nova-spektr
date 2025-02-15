import { createEvent, createStore, sample, restore, combine } from 'effector';
import { spread, delay } from 'patronum';

import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel } from '@features/operations/OperationSubmit';
import { Step, UnstakeStore, NetworkStore } from '../lib/types';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { nonNullable, getRelaychainAsset } from '@shared/lib/utils';
import { unstakeUtils } from '../lib/unstake-utils';
import { BasketTransaction, Transaction } from '@shared/core';
import { basketModel } from '@entities/basket';
import { walletModel, walletUtils } from '@entities/wallet';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $unstakeStore = createStore<UnstakeStore | null>(null);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $wrappedTxs = createStore<Transaction[] | null>(null);
const $multisigTxs = createStore<Transaction[] | null>(null);
const $coreTxs = createStore<Transaction[] | null>(null);

const $initiatorWallet = combine(
  {
    store: $unstakeStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return undefined;

    return walletUtils.getWalletById(wallets, store.shards[0].walletId);
  },
  { skipVoid: false },
);

sample({ clock: stepChanged, target: $step });

sample({
  clock: flowStarted,
  target: formModel.events.formInitiated,
});

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: formModel.output.formSubmitted,
  fn: ({ transactions, formData }) => {
    const wrappedTxs = transactions.map((tx) => tx.wrappedTx);
    const multisigTxs = transactions.map((tx) => tx.multisigTx).filter(nonNullable);
    const coreTxs = transactions.map((tx) => tx.coreTx);

    return {
      wrappedTxs,
      multisigTxs: multisigTxs.length === 0 ? null : multisigTxs,
      coreTxs,
      unstakeStore: formData,
    };
  },
  target: spread({
    wrappedTxs: $wrappedTxs,
    multisigTxs: $multisigTxs,
    coreTxs: $coreTxs,
    unstakeStore: $unstakeStore,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: $networkStore,
  filter: (network: NetworkStore | null): network is NetworkStore => Boolean(network),
  fn: ({ chain }, { formData }) => ({
    event: { ...formData, chain, asset: getRelaychainAsset(chain.assets)! },
    step: Step.CONFIRM,
  }),
  target: spread({
    event: confirmModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.output.formSubmitted,
  source: {
    unstakeStore: $unstakeStore,
    networkStore: $networkStore,
    wrappedTxs: $wrappedTxs,
  },
  filter: ({ unstakeStore, networkStore, wrappedTxs }) => {
    return Boolean(unstakeStore) && Boolean(networkStore) && Boolean(wrappedTxs);
  },
  fn: ({ unstakeStore, networkStore, wrappedTxs }) => ({
    event: {
      chain: networkStore!.chain,
      accounts: unstakeStore!.shards,
      signatory: unstakeStore!.signatory,
      transactions: wrappedTxs!,
    },
    step: Step.SIGN,
  }),
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: signModel.output.formSubmitted,
  source: {
    unstakeStore: $unstakeStore,
    networkStore: $networkStore,
    multisigTxs: $multisigTxs,
    wrappedTxs: $wrappedTxs,
    coreTxs: $coreTxs,
  },
  filter: (transferData) => {
    return (
      Boolean(transferData.unstakeStore) &&
      Boolean(transferData.wrappedTxs) &&
      Boolean(transferData.coreTxs) &&
      Boolean(transferData.networkStore)
    );
  },
  fn: (transferData, signParams) => ({
    event: {
      ...signParams,
      chain: transferData.networkStore!.chain,
      account: transferData.unstakeStore!.shards[0],
      signatory: transferData.unstakeStore!.signatory,
      description: transferData.unstakeStore!.description,
      wrappedTxs: transferData.wrappedTxs!,
      coreTxs: transferData.coreTxs!,
      multisigTxs: transferData.multisigTxs || [],
    },
    step: Step.SUBMIT,
  }),
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: delay(submitModel.output.formSubmitted, 2000),
  source: $step,
  filter: (step) => unstakeUtils.isSubmitStep(step),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.events.formCleared],
});

sample({
  clock: txSaved,
  source: {
    store: $unstakeStore,
    coreTxs: $coreTxs,
    txWrappers: formModel.$txWrappers,
  },
  filter: ({ store, coreTxs, txWrappers }: any) => {
    return Boolean(store) && Boolean(coreTxs) && Boolean(txWrappers);
  },
  fn: ({ store, coreTxs, txWrappers }) => {
    const txs = coreTxs!.map(
      (coreTx) =>
        ({
          initiatorWallet: store!.shards[0].walletId,
          coreTx,
          txWrappers,
          groupId: Date.now(),
        } as BasketTransaction),
    );

    return txs;
  },
  target: basketModel.events.transactionsCreated,
});

sample({
  clock: txSaved,
  target: flowFinished,
});

export const unstakeModel = {
  $step,
  $networkStore,
  $initiatorWallet,

  events: {
    flowStarted,
    stepChanged,
    txSaved,
  },
  output: {
    flowFinished,
  },
};
