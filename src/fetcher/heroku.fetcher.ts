import {
  FetcherInterface,
  BillingDetail,
  BillingSummary,
} from './fetcher.interface';
import { FetcherHelper } from './helper';

export class HerokuFetcher implements FetcherInterface {
  constructor(config: any, private helper: FetcherHelper) {}

  static getName(): string {
    return 'Heroku';
  }

  async getBillingList(): Promise<BillingSummary[] | null> {
    await this.helper.loadUrl(`https://dashboard.heroku.com/account/billing`);

    await this.helper.clickElement('button.show-more');

    return this.helper.getBillingListByTableElem(
      '.invoices table',
      (row: Element) => {
        return Array.from(row.querySelectorAll('form'))
          .map((elem: Element) => {
            if (
              !elem
                .getAttribute('action')
                ?.match(
                  /https:\/\/particleboard.heroku.com\/account\/invoices\/(\d+)/
                )
            ) {
              return null;
            }

            return RegExp.$1;
          })
          .filter((str: string | null) => str !== null)[0];
      },
      (row: Element) => {
        return (
          row.querySelector('td input[type="submit"]') as HTMLInputElement
        ).value;
      },
      1
    );
  }

  async getBillingDetail(id: string): Promise<BillingDetail | null> {
    return {
      id,
      summaryText: '',
      totalPrice: 0,
      taxPrice: 0,
      taxPercentage: 0,
      priceCurrency: 'JPY',
      startDate: '',
      endDate: '',
    };
  }

  async getBillingDetailAsPdf(): Promise<string> {
    throw new Error('Method not implemented.');
  }
}
