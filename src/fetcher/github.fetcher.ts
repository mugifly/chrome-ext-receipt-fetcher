import {
  FetcherInterface,
  BillingDetail,
  BillingSummary,
} from './interface/fetcher.interface';
import { FetcherHelper } from './helper';
import { UserActionRequiredException } from './exception/user-action-required-exception';

export class GithubFetcher implements FetcherInterface {
  protected config: {
    organizationName: string;
  };

  constructor(config: any, private helper: FetcherHelper) {
    if (!config.organizationName) {
      throw new Error('organizationName is required');
    }

    this.config = {
      organizationName: config.organizationName,
    };
  }

  static getName(): string {
    return 'GitHub';
  }

  static getEvidenceFileType(): 'url' | 'image' {
    return 'url';
  }

  async getBillingList(): Promise<BillingSummary[] | null> {
    await this.helper.loadUrl(
      `https://github.com/organizations/${this.config.organizationName}/billing/history`
    );

    if ((await this.helper.getUrl()).href.match(/github\.com\/login/)) {
      throw new UserActionRequiredException('Please complete login');
    }

    const billingList: BillingSummary[] = [];

    const document = await this.helper.getDocument();
    const rows = Array.from(
      document.querySelectorAll('.payment-history ul li')
    );
    for (const row of rows) {
      const id = row.querySelector('.id')?.textContent?.trim();
      if (!id) continue;

      const date = row.querySelector('.date')?.textContent?.trim();
      if (!date) continue;

      const amount = row.querySelector('.amount')?.textContent?.trim();
      if (!amount) continue;

      const receiptLink = row.querySelector('.receipt a');
      let receiptLinkUrl = undefined;
      if (receiptLink && receiptLink.getAttribute('href')) {
        receiptLinkUrl = receiptLink.getAttribute('href') || undefined;
      }

      if (receiptLinkUrl && receiptLinkUrl.indexOf('/') === 0) {
        receiptLinkUrl = `https://github.com${receiptLinkUrl}`;
      }

      let priceCurrency = 'USD';
      if (amount.match(/[¥￥]/)) {
        priceCurrency = 'JPY';
      }

      billingList.push({
        id: id,
        summaryText: date,
        totalPrice: parseFloat(amount.replace(/[\$,]/g, '')),
        priceCurrency: priceCurrency,
        linkUrl: receiptLinkUrl,
      });
    }

    return billingList;
  }

  async getBillingEvidence(id: string): Promise<Blob> {
    const billingList = await this.getBillingList();
    if (!billingList) throw new Error('Could not get billing list');

    const billingItem = billingList.find((billing: BillingSummary) => {
      return billing.id === id;
    });
    if (!billingItem) throw new Error('Could not get billing item');

    if (!billingItem.linkUrl)
      throw new Error('Could not get url of billing item');

    return await this.helper.getFileByUrl(billingItem.linkUrl, {
      Accept: 'application/pdf',
    });
  }
}
