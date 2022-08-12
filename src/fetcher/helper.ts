import { BillingSummary } from './fetcher.interface';

export class FetcherHelper {
  private tabId: number;

  constructor(tabId: number) {
    this.tabId = tabId;
  }

  async loadUrl(url: string): Promise<void> {
    // Request to content script
    try {
      const response = await this.requestToContentScript({
        message: 'loadUrl',
        url: url,
      });
      console.log(`[FetcherHelper] loadUrl - Response received... `, response);
    } catch (e: any) {
      window.alert('Error: ' + e.message);
    }
  }

  async getDocument(): Promise<Document> {
    // Request to content script
    try {
      const response = await this.requestToContentScript({
        message: 'getContent',
      });
      const html = response.result;
      const dom = new DOMParser().parseFromString(html, 'text/html');
      console.log(
        `[FetcherHelper] getDocument - Response received... `,
        response
      );
      return dom;
    } catch (e: any) {
      throw new Error('Could not get document...' + e.message);
    }
  }

  async clickElement(selector: string): Promise<void> {
    // Request to content script
    try {
      const response = await this.requestToContentScript({
        message: 'clickElement',
        selector: selector,
      });
      console.log(
        `[FetcherHelper] clickElement - Response received... `,
        response
      );
    } catch (e: any) {
      window.alert('Error: ' + e.message);
    }
  }

  async requestToContentScript(args: any, count: number = 1): Promise<any> {
    // Find tabs
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tabs || !tabs[0].id) {
      throw new Error(`[FetcherHelper] requestToContentScript - No tabs`);
    }

    const tabId = tabs[0].id;

    const response = await this.sendMessageToContentScript(args);
    if (!response) {
      if (5 <= count) {
        console.warn(
          '[FetcherHelper] requestToContentScript - Connection with Content Script is rejected'
        );
        return;
      }

      // Retrying
      console.warn(
        '[FetcherHelper] requestToContentScript - Retrying because the connection with Content Script is rejected'
      );
      await FetcherHelper.asyncTimeout(1000);
      return await this.requestToContentScript(args, count + 1);
    } else if (response.error) {
      console.warn(
        '[FetcherHelper] requestToContentScript - Error occurred...',
        response
      );
      throw new Error(response.error);
    }

    return response;
  }

  async sendMessageToContentScript(args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log(
        '[FetcherHelper] sendMessageToContentScript - Message = ',
        args
      );
      chrome.tabs.sendMessage(this.tabId, args, async (response: any) => {
        resolve(response);
      });
    });
  }

  async getBillingListByTableElem(
    tableElem: string | Element,
    billingIdColumn: string | ((row: Element) => string | null) | number,
    summaryTextColumn: string | ((row: Element) => string | null) | number,
    totalPriceTextColumn: string | ((row: Element) => string | null) | number
  ): Promise<BillingSummary[]> {
    const document = await this.getDocument();

    const elem =
      typeof tableElem === 'string'
        ? document.querySelector(tableElem)
        : tableElem;
    if (!elem) throw new Error('Could not find the table element.');

    // Find columns
    const columnNumbers: { [key: string]: number | null } = {
      summaryText:
        typeof summaryTextColumn === 'number' ? summaryTextColumn : null,
      totalPrice:
        typeof totalPriceTextColumn === 'number' ? totalPriceTextColumn : null,
      billingId: typeof billingIdColumn === 'number' ? billingIdColumn : null,
    };
    const tableRows = Array.from(elem.querySelectorAll('tr'));
    const columnsOfFirstRow = Array.from(tableRows[0].querySelectorAll('th'));

    for (let i = 0; i < columnsOfFirstRow.length; i++) {
      const column = columnsOfFirstRow[i];
      const text = column.textContent;
      if (!text) continue;

      if (
        typeof billingIdColumn === 'string' &&
        !columnNumbers['billingId'] &&
        text.indexOf(billingIdColumn) !== -1
      ) {
        columnNumbers['billingId'] = i;
        continue;
      }

      if (
        typeof summaryTextColumn === 'string' &&
        !columnNumbers['summaryText'] &&
        text.indexOf(summaryTextColumn) !== -1
      ) {
        columnNumbers['summaryText'] = i;
        continue;
      }

      if (
        typeof totalPriceTextColumn === 'string' &&
        !columnNumbers['totalPrice'] &&
        text.indexOf(totalPriceTextColumn) !== -1
      ) {
        columnNumbers['totalPrice'] = i;
        continue;
      }
    }

    console.log(
      `[FetcherHelper] getBillingListByTableElem - columnNumbers = `,
      columnNumbers
    );

    // Check columns
    if (
      typeof billingIdColumn !== 'function' &&
      columnNumbers['billingId'] === null
    )
      throw new Error('Could not detected billingId column.');

    if (
      typeof summaryTextColumn !== 'function' &&
      columnNumbers['summaryText'] === null
    )
      throw new Error('Could not detected summaryText column.');

    if (
      typeof totalPriceTextColumn !== 'function' &&
      columnNumbers['totalPrice'] === null
    )
      throw new Error('Could not detected totalPrice column.');

    // Get column values
    const billingList: BillingSummary[] = [];
    for (let i = 1; i < tableRows.length; i++) {
      const row = tableRows[i];
      const cells = Array.from(row.querySelectorAll('td'));

      // Get column value - Billing ID
      let billingId = null;
      if (typeof billingIdColumn === 'function') {
        billingId = billingIdColumn(row);
      } else if (columnNumbers['billingId']) {
        billingId = cells[columnNumbers['billingId']]?.textContent;
      }

      if (!billingId) {
        console.warn('Could not detected billingId from this row...', row);
        continue;
      }

      // Get column value Summary Price
      let summaryText = null;
      if (typeof summaryTextColumn === 'function') {
        summaryText = summaryTextColumn(row);
      } else if (columnNumbers['summaryText']) {
        summaryText = cells[columnNumbers['summaryText']].textContent;
      }

      // Get column value Total Price
      let totalPrice = null;
      if (typeof totalPriceTextColumn === 'function') {
        totalPrice = totalPriceTextColumn(row);
      } else if (columnNumbers['totalPrice']) {
        totalPrice = cells[columnNumbers['totalPrice']].textContent;
      }

      billingList.push({
        id: billingId,
        summaryText: summaryText || 'N/A',
        totalPrice: totalPrice
          ? parseInt(totalPrice.replace(/[^0-9]/g, ''), 10)
          : null,
      });
    }

    return billingList;
  }

  static async asyncTimeout(msec: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, msec);
    });
  }
}
