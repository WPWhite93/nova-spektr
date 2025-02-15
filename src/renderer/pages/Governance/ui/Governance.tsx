import { useEffect } from 'react';

import { useI18n } from '@app/providers';
import { Header } from '@shared/ui';
import { governanceModel } from '../model/governance-model';
import {
  ReferendumList,
  ReferendumFilter,
  ReferendumDetails,
  ChainSelector,
  Locks,
  Delegations,
} from '@features/governance';

export const Governance = () => {
  const { t } = useI18n();

  useEffect(() => {
    governanceModel.events.componentMounted();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <Header title={t('governance.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        <ReferendumFilter />
      </Header>

      <div className="overflow-y-auto w-full h-full py-6">
        <section className="flex flex-col h-full w-[736px] mx-auto">
          <div className="flex gap-x-3">
            <ChainSelector />
            <Locks onClick={() => console.log('Go to Unlock')} />
            <Delegations onClick={() => console.log('Go to Delegate')} />
          </div>

          {/* TODO: Tracks - Vote filter */}

          <ReferendumList />
        </section>
      </div>

      <ReferendumDetails />
    </div>
  );
};
