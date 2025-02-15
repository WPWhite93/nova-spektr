import { Store, createEffect, createEvent, sample } from 'effector';
import { ApiPromise } from '@polkadot/api';

import { Asset, Balance, Chain, ID, Transaction } from '@shared/core';
import { TransferRules } from '@features/operations/OperationsValidation';
import { getAssetById, toAccountId, transferableAmount } from '@shared/lib/utils';
import { balanceModel, balanceUtils } from '@entities/balance';
import { BalanceMap, NetworkStore } from '@widgets/Transfer/lib/types';
import {
  TransferAccountStore,
  TransferAmountFeeStore,
  TransferSignatoryFeeStore,
  ValidationResult,
} from '../types/types';
import { validationUtils } from '../lib/validation-utils';
import { networkModel } from '@entities/network';
import { transactionService } from '@entities/transaction';

const validationStarted = createEvent<{ id: ID; transaction: Transaction }>();
const txValidated = createEvent<{ id: ID; result: ValidationResult }>();

type ValidateParams = {
  id: ID;
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  transaction: Transaction;
  balances: Balance[];
};

const validateFx = createEffect(async ({ id, api, chain, asset, transaction, balances }: ValidateParams) => {
  const accountId = toAccountId(transaction.address);

  const fee = await transactionService.getTransactionFee(transaction, api);

  const rules = [
    {
      value: transaction.address,
      form: {},
      ...TransferRules.account.noProxyFee({} as Store<TransferAccountStore>),
      source: {
        fee,
        // TODO: Add support proxy
        isProxy: false,
        proxyBalance: '0',
      },
    },
    {
      value: undefined,
      form: {},
      ...TransferRules.signatory.notEnoughTokens({} as Store<TransferSignatoryFeeStore>),
      source: {
        fee,
        isMultisig: false,
        multisigDeposit: '0',
        balance: '0',
      } as TransferSignatoryFeeStore,
    },
    {
      value: transaction.args.value,
      form: {},
      ...TransferRules.amount.notEnoughBalance({} as Store<{ network: NetworkStore | null; balance: BalanceMap }>, {
        withFormatAmount: false,
      }),
      source: {
        network: { chain: chain, asset: asset },
        balance: {
          native: transferableAmount(
            balanceUtils.getBalance(balances, accountId, chain.chainId, chain.assets[0].assetId.toFixed()),
          ),
          balance: transferableAmount(
            balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId.toFixed()),
          ),
        },
      } as { network: NetworkStore | null; balance: BalanceMap },
    },
    {
      value: transaction.args.value,
      form: {},
      ...TransferRules.amount.insufficientBalanceForFee({} as Store<TransferAmountFeeStore>, {
        withFormatAmount: false,
      }),
      source: {
        network: { chain, asset },
        // TODO: ADd support multisig
        isMultisig: false,
        multisigDeposit: '0',
        fee,
        xcmFee: transaction.args.xcmData?.args.xcmFee || '0',
        // TODO: Add support proxy
        isProxy: false,
        isNative: chain.assets[0].assetId === asset.assetId,
        isXcm: Boolean(transaction.args.xcmData),
        balance: {
          native: transferableAmount(
            balanceUtils.getBalance(balances, accountId, chain.chainId, chain.assets[0].assetId.toFixed()),
          ),
          balance: transferableAmount(
            balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId.toFixed()),
          ),
        },
      } as TransferAmountFeeStore,
    },
  ];

  const result = validationUtils.applyValidationRules(rules);

  return {
    id,
    result,
  };
});

sample({
  clock: validationStarted,
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balances,
  },
  filter: ({ apis }, { transaction }) => Boolean(apis[transaction.chainId]),
  fn: ({ apis, chains, balances }, { id, transaction }) => {
    const chain = chains[transaction.chainId];
    const api = apis[transaction.chainId];
    const asset = getAssetById(transaction.args.assetId, chain.assets) || chain.assets[0];

    return {
      id,
      api,
      transaction,
      chain,
      asset,
      balances,
    };
  },
  target: validateFx,
});

sample({
  clock: validateFx.doneData,
  target: txValidated,
});

export const transferValidateModel = {
  events: {
    validationStarted,
  },
  output: {
    txValidated,
  },
};
