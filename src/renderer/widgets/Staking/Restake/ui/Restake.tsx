import { useUnit } from 'effector-react';

import { BaseModal, Button } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { OperationSign, OperationSubmit } from '@features/operations';
import { ReturnToStakeForm } from './RestakeForm';
import { Confirmation } from './Confirmation';
import { restakeUtils } from '../lib/restake-utils';
import { restakeModel } from '../model/restake-model';
import { Step } from '../lib/types';
import { basketUtils } from '@features/operations/OperationsConfirm';

export const Restake = () => {
  const { t } = useI18n();

  const step = useUnit(restakeModel.$step);
  const networkStore = useUnit(restakeModel.$networkStore);
  const initiatorWallet = useUnit(restakeModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!restakeUtils.isNoneStep(step), restakeModel.output.flowFinished);

  if (!networkStore) return null;

  if (restakeUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

  return (
    <BaseModal
      closeButton
      contentClass=""
      isOpen={isModalOpen}
      title={
        <OperationTitle
          title={t('staking.restake.title', { asset: networkStore.chain.assets[0].symbol })}
          chainId={networkStore.chain.chainId}
        />
      }
      onClose={closeModal}
    >
      {restakeUtils.isInitStep(step) && <ReturnToStakeForm onGoBack={closeModal} />}
      {restakeUtils.isConfirmStep(step) && (
        <Confirmation
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => restakeModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => restakeModel.events.stepChanged(Step.INIT)}
        />
      )}
      {restakeUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => restakeModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
