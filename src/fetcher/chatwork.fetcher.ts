import {
  FetcherInterface,
  BillingDetail,
  BillingSummary,
} from './interface/fetcher.interface';
import { FetcherHelper } from './helper';
import { UserActionRequiredException } from './exception/user-action-required-exception';

export class ChatworkFetcher implements FetcherInterface {
  constructor(config: any, private helper: FetcherHelper) {}

  static getName(): string {
    return 'Chatwork';
  }

  async getBillingList(): Promise<BillingSummary[] | null> {
    await this.helper.loadUrl(
      `https://www.chatwork.com/service/packages/chatwork/subpackages/pay/history.php`
    );

    if ((await this.helper.getUrl()).href.match(/login/)) {
      throw new UserActionRequiredException('Please complete login');
    }

    return this.helper.getBillingListByTableElem({
      tableElem: '.payHistoryTable',
      billingIdColumn: (row: Element) => {
        return (
          row
            .querySelector('.download_pdf')
            ?.getAttribute('id')
            ?.replace(/[^0-9]/g, '') || null
        );
      },
      summaryTextColumn: 0,
      totalPriceTextColumn: 2,
      currencyCode: 'JPY',
    });
  }

  async getBillingEvidence(item: BillingSummary): Promise<Blob> {
    return await this.helper.getFileByUrl({
      url: `https://www.chatwork.com/service/packages/chatwork/subpackages/pay/history.php?download=1&history_id=${item.id}&invoice=receipt`,
      mode: 'no-cors',
    });
  }
}
