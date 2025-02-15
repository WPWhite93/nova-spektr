import { useEffect, useState } from 'react';

import { useCountdown } from '@shared/lib/hooks';
import { ValidationErrors, toAddress } from '@shared/lib/utils';
import { useTransaction, ScanMultiframeQr, ScanSingleframeQr, QrReaderWrapper } from '@entities/transaction';
import { accountUtils, walletUtils } from '@entities/wallet';
import type { HexString, Address } from '@shared/core';
import type { InnerSigningProps } from '../lib/types';
import { operationSignUtils } from '../lib/operation-sign-utils';

export const Vault = ({
  chainId,
  api,
  addressPrefix,
  validateBalance,
  accounts,
  wallet,
  signatory,
  transactions,
  onGoBack,
  onResult,
}: InnerSigningProps) => {
  const { verifySignature } = useTransaction();

  const [countdown, resetCountdown] = useCountdown(api);
  const [txPayloads, setTxPayloads] = useState<Uint8Array[]>([]);
  const [validationError, setValidationError] = useState<ValidationErrors>();

  const isScanStep = !txPayloads.length;
  const isMultiframe = transactions.length > 1;

  useEffect(() => {
    if (countdown === 0) {
      scanAgain();
    }
  }, [countdown]);

  const handleSignature = async (data: string | string[]): Promise<void> => {
    const isMultishard = Array.isArray(data);
    const signatures = isMultishard
      ? (data as HexString[]).map(operationSignUtils.transformEcdsaSignature)
      : [data as HexString].map(operationSignUtils.transformEcdsaSignature);

    const accountIds = isMultiframe ? accounts.map((t) => t.accountId) : [(signatory || accounts[0])?.accountId];

    const isVerified = signatures.every((signature, index) => {
      // TODO: Research complex verification
      // TODO: research multishard signature verification
      if (isMultishard) return true;

      const payload = txPayloads[index];
      const verifiablePayload = payload?.slice(1);
      const verifiableComplexPayload = payload?.slice(2);

      const isVerified =
        verifiablePayload && verifySignature(verifiablePayload, signature as HexString, accountIds[index]);
      const isComplexVerified =
        verifiableComplexPayload &&
        verifySignature(verifiableComplexPayload, signature as HexString, accountIds[index]);

      return isVerified || isComplexVerified;
    });

    const balanceValidationError = validateBalance && (await validateBalance());

    if (!isVerified || balanceValidationError) {
      setValidationError(balanceValidationError || ValidationErrors.INVALID_SIGNATURE);
    } else {
      onResult(signatures, txPayloads);
    }
  };

  const getSignerAddress = (): Address => {
    if (!walletUtils.isPolkadotVault(wallet)) return transactions[0].address;

    const root = accountUtils.getBaseAccount(wallet.accounts, wallet.id);

    return root ? toAddress(root.accountId, { prefix: 1 }) : transactions[0].address;
  };

  const scanAgain = () => {
    setTxPayloads([]);
  };

  if (isScanStep) {
    return (
      <div className="w-[440px] px-5 py-4">
        {isMultiframe ? (
          <ScanMultiframeQr
            chainId={chainId}
            api={api}
            addressPrefix={addressPrefix}
            countdown={countdown}
            accounts={accounts}
            rootAddress={walletUtils.isPolkadotVault(wallet) ? getSignerAddress() : undefined}
            signerWallet={wallet}
            transactions={transactions}
            onGoBack={onGoBack}
            onResetCountdown={resetCountdown}
            onResult={(payloads) => setTxPayloads(payloads)}
          />
        ) : (
          <ScanSingleframeQr
            chainId={chainId}
            api={api}
            address={getSignerAddress()}
            countdown={countdown}
            account={signatory || accounts[0]}
            signerWallet={wallet}
            transaction={transactions[0]}
            onGoBack={onGoBack}
            onResetCountdown={resetCountdown}
            onResult={(payload) => setTxPayloads([payload])}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-y-2.5 w-[440px] rounded-b-lg bg-black">
      <QrReaderWrapper
        isMultiFrame={isMultiframe}
        countdown={countdown || 0}
        validationError={validationError}
        onResult={handleSignature}
        onGoBack={scanAgain}
      />
    </div>
  );
};
