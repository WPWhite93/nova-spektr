import { Trans } from 'react-i18next';

import { WalletIcon } from '@entities/wallet';
import type { MultisigCreated } from '@shared/core';
import { WalletType } from '@shared/core';
import { BodyText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { ChainTitle } from '@entities/chain';

type Props = {
  notification: MultisigCreated;
};

export const MultisigCreatedNotification = ({
  notification: { threshold, signatories, multisigAccountName, chainId },
}: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex gap-x-2">
      <div className="relative">
        <WalletIcon type={WalletType.MULTISIG} />
        <div className="absolute top-[13px] -right-[1px] h-2 w-2 rounded-full bg-icon-positive border border-white" />
      </div>

      <div className="flex flex-col gap-y-2">
        <BodyText>{t('notifications.details.multisigCreatedTitle')}</BodyText>
        <BodyText className="inline-flex flex-wrap gap-y-2 items-center">
          <Trans
            t={t}
            i18nKey="notifications.details.multisigCreatedDescription"
            values={{
              threshold,
              signatoriesLength: signatories.length,
              name: multisigAccountName,
            }}
            components={{
              chain: <ChainTitle chainId={chainId} fontClass="text-text-primary text-body" />,
            }}
          />
        </BodyText>
      </div>
    </div>
  );
};
