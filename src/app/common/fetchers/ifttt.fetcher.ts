import { FetcherHelper } from './fetcher.helper';
import { UserActionRequiredException } from '../user-action-required.exception';
import { BillingItem } from 'src/app/home/billing-item';
import { Fetcher } from 'src/app/common/fetcher';
import { BillingSummary } from 'src/app/common/billing-summary';

export class IftttFetcher implements Fetcher {
  constructor(config: any, private helper: FetcherHelper) {}

  static getName(): string {
    return 'IFTTT';
  }

  async getBillingList(): Promise<BillingSummary[] | null> {
    await this.helper.loadUrl(`https://ifttt.com/billing`);

    if ((await this.helper.getUrl()).href.match(/(join|session\/new)/)) {
      throw new UserActionRequiredException('Please complete login');
    }

    let items = await this.helper.getBillingListByTableElem({
      tableElem: '.billing-history',
      billingIdColumn: (row: Element) => {
        return Array.from(row.querySelectorAll('a'))
          .map((elem: Element) => {
            if (
              !elem
                .getAttribute('href')
                ?.match(
                  /pay\.stripe\.com\/receipts\/invoices\/([a-zA-Z0-9\-_]+)/
                )
            ) {
              return null;
            }

            return RegExp.$1;
          })
          .filter((str: string | null) => str !== null)[0];
      },
      summaryTextColumn: 0,
      totalPriceTextColumn: 1,
      linkUrlColumn: 2,
      currencyCode: 'USD',
    });

    items = items.map((item: BillingSummary) => {
      item.linkUrl = item.linkUrl?.replace(/\?.*$/, '/pdf?s=em');
      return item;
    });

    return items;
  }

  async getBillingEvidence(item: BillingSummary): Promise<Blob> {
    const billingList = await this.getBillingList();
    if (!billingList) throw new Error('Could not get billing list');

    const billingItem = billingList.find((billing: BillingSummary) => {
      return billing.summaryText === item.summaryText;
    });
    if (!billingItem || !billingItem.linkUrl) {
      throw new Error('Could not get billing item');
    }

    return await this.helper.getFileByUrl({
      url: billingItem.linkUrl,
      mode: 'no-cors',
    });
  }
}
