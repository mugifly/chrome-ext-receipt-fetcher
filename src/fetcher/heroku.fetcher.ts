import {
  FetcherInterface,
  BillingDetail,
  BillingSummary,
} from './interface/fetcher.interface';
import { FetcherHelper } from './helper';
import { UserActionRequiredException } from './exception/user-action-required-exception';

export class HerokuFetcher implements FetcherInterface {
  constructor(config: any, private helper: FetcherHelper) {}

  static getName(): string {
    return 'Heroku';
  }

  static getEvidenceFileType(): 'url' | 'image' {
    return 'image';
  }

  async getBillingList(): Promise<BillingSummary[] | null> {
    await this.helper.loadUrl(`https://dashboard.heroku.com/account/billing`);

    if ((await this.helper.getUrl()).href.match(/login/)) {
      throw new UserActionRequiredException('Please complete login');
    } else if ((await this.helper.getUrl()).href.match(/verify/)) {
      throw new UserActionRequiredException(
        'Please complete two-factor authentication'
      );
    }

    await this.helper.clickElement('button.show-more');

    return this.helper.getBillingListByTableElem({
      tableElem: '.invoices table',
      billingIdColumn: (row: Element) => {
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
      summaryTextColumn: (row: Element) => {
        return (
          row.querySelector('td input[type="submit"]') as HTMLInputElement
        ).value;
      },
      totalPriceTextColumn: 1,
      currencyCode: 'USD',
    });
  }

  async getBillingEvidence(id: string): Promise<Blob> {
    await this.helper.loadUrl(`https://dashboard.heroku.com/account/billing`);

    await this.helper.clickElement('button.show-more');

    const document = await this.helper.getDocument();
    const forms = Array.from(document.querySelectorAll('form'))
      .map((form: Element): Element | null => {
        const url = form.getAttribute('action');
        if (!url) return null;

        const urlMatches = url.match(
          'https://particleboard.heroku.com/account/invoices/(\\d+)'
        );
        if (!urlMatches || urlMatches[1] !== id) {
          return null;
        }

        return form;
      })
      .filter((form: Element | null) => {
        return form !== null;
      });

    if (forms.length === 0 || !forms[0]) {
      throw new Error(`No invoice found for id: ${id}`);
    }

    const form = forms[0];

    // To open the page on the current tab
    await this.helper.setElementAttribute(
      'form[action="' + form.getAttribute('action') + '"]',
      'target',
      ''
    );

    // Click the link
    const clickValue = (form.querySelector('.bn') as HTMLInputElement).value;
    await this.helper.clickElement('input[value="' + clickValue + '"');
    await this.helper.asyncTimeout(500);

    return this.helper.getBlobByDataUrl(await this.helper.printAsImage());
  }
}
