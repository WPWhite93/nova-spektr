import { PropsWithChildren } from 'react';
import cn from 'classnames';

import { Button, CaptionText, FootnoteText, InfoLink, SmallTitleText, Icon, Shimmering } from '@renderer/shared/ui';
import { secondsToMinutes } from '@renderer/shared/lib/utils';
import { useI18n } from '@renderer/app/providers';
import { getMetadataPortalMetadataUrl, TROUBLESHOOTING_URL } from '../common/constants';
import type { ChainId } from '@renderer/shared/core';

type Props = {
  countdown: number;
  onQrReset: () => void;
  chainId: ChainId;
};

const QrGeneratorContainer = ({ countdown, onQrReset, chainId, children }: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  return (
    <section className="flex flex-col items-center flex-1">
      <SmallTitleText>{t('signing.scanQrTitle')}</SmallTitleText>

      <div className="flex items-center gap-x-2 mt-2 mb-6">
        <FootnoteText className="text-text-tertiary">{t('signing.qrCountdownTitle')}</FootnoteText>
        <CaptionText
          align="center"
          className={cn(
            'py-1 px-2 w-[50px] h-5 rounded-[26px] text-white',
            ((countdown === 0 || !children) && 'bg-label-background-gray') ||
              (countdown >= 60 ? 'bg-label-background-green' : 'bg-label-background-red'),
          )}
        >
          {/* if qr not loaded yet just show zero */}
          {secondsToMinutes(children ? countdown : 0)}
        </CaptionText>
      </div>

      <div className="w-[240px] h-[240px] relative flex flex-col items-center justify-center gap-y-4">
        {children &&
          (countdown > 0 ? (
            children
          ) : (
            <>
              {/* qr expired */}
              <Icon name="qrFrame" className="absolute w-full h-full" />
              <FootnoteText>{t('signing.qrNotValid')}</FootnoteText>
              <Button className="z-10" size="sm" prefixElement={<Icon size={16} name="refresh" />} onClick={onQrReset}>
                {t('signing.generateNewQrButton')}
              </Button>
            </>
          ))}

        {!children && <Shimmering />}
      </div>

      <div className="flex flex-row items-center gap-x-2 mt-2 mb-4.5 h-[78px]">
        <InfoLink url={TROUBLESHOOTING_URL}>{t('signing.troubleshootingLink')}</InfoLink>

        <span className="border border-divider h-4"></span>

        <InfoLink url={getMetadataPortalMetadataUrl(chainId)}>{t('signing.metadataPortalLink')}</InfoLink>
      </div>
    </section>
  );
};

export default QrGeneratorContainer;
