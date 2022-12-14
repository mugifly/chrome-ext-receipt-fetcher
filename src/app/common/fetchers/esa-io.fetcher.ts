import { FetcherHelper } from './fetcher.helper';
import { UserActionRequiredException } from '../user-action-required.exception';
import { BillingSummary } from 'src/app/common/billing-summary';
import { Fetcher } from 'src/app/common/fetcher';

export class EsaIoFetcher implements Fetcher {
  protected config: {
    teamName: string;
  };

  constructor(config: any, private helper: FetcherHelper) {
    if (!config.teamName) {
      throw new Error('teamName is required');
    }

    this.config = {
      teamName: config.teamName,
    };
  }

  static getName(): string {
    return 'esa.io';
  }

  async getBillingList(): Promise<BillingSummary[] | null> {
    await this.helper.loadUrl(
      `https://${this.config.teamName}.esa.io/team/billing`
    );

    if ((await this.helper.getTitle()).match(/404 Error/)) {
      throw new UserActionRequiredException('Please complete login');
    }

    return this.helper.getBillingListByTableElem({
      tableElem: '.table-invoice',
      billingIdColumn: (row: Element) => {
        return Array.from(row.querySelectorAll('a'))
          .map((elem: Element) => {
            if (
              !elem
                .getAttribute('href')
                ?.match(/\/team\/receipts\/([a-zA-Z0-9]+)/)
            ) {
              return null;
            }

            return RegExp.$1;
          })
          .filter((str: string | null) => str !== null)[0];
      },
      summaryTextColumn: 'お支払日',
      totalPriceTextColumn: '合計金額',
      currencyCode: 'JPY',
    });
  }

  async getBillingEvidence(item: BillingSummary): Promise<Blob> {
    await this.helper.loadUrl(
      `https://${this.config.teamName}.esa.io/team/receipts/${item.id}`
    );
    return this.helper.getBlobByDataUrl(await this.helper.printAsImage());
  }
}
