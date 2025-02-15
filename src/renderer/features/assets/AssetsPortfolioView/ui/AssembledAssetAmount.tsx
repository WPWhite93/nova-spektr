import { PropsWithChildren } from 'react';
import { Trans } from 'react-i18next';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { totalAmount, transferableAmount } from '@shared/lib/utils';
import type { AssetBalance as Balance, AssetByChains } from '@shared/core';
import { Shimmering, Tooltip } from '@shared/ui';
import { AssetBalance } from '@entities/asset';
import { AssetFiatBalance, priceProviderModel } from '@entities/price';

type Props = PropsWithChildren & {
  asset: AssetByChains;
  balance?: Balance;
};

export const AssembledAssetAmount = ({ balance, asset }: Props) => {
  const { t } = useI18n();
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  if (!balance?.free) {
    return (
      <div className="flex flex-col gap-y-1 items-end">
        <Shimmering width={82} height={20} />
        {fiatFlag && <Shimmering width={56} height={18} />}
      </div>
    );
  }

  return (
    <>
      <Tooltip
        content={
          <Trans
            t={t}
            i18nKey="balances.balanceTooltip"
            components={{
              amountFree: (
                <AssetBalance value={transferableAmount(balance)} asset={asset} className="text-white text-help-text" />
              ),
              amountLocked: balance.frozen ? (
                <AssetBalance value={balance.frozen} asset={asset} className="text-white text-help-text" />
              ) : (
                <Shimmering width={50} height={7} className="bg-white inline-block" />
              ),
              amountReserved: balance.reserved ? (
                <AssetBalance value={balance.reserved} asset={asset} className="text-white text-help-text" />
              ) : (
                <Shimmering width={50} height={7} className="bg-white inline-block" />
              ),
            }}
          />
        }
        offsetPx={-75}
      >
        <AssetBalance
          value={totalAmount(balance)}
          asset={asset}
          showSymbol={false}
          className="border-b border-filter-border hover:bg-switch-background-inactive"
        />
      </Tooltip>
      <AssetFiatBalance amount={totalAmount(balance)} asset={asset} />
    </>
  );
};
