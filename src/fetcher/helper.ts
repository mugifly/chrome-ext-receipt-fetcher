import { BillingSummary } from './interface/fetcher.interface';

export class FetcherHelper {
  private tabId: number;

  constructor(tabId: number) {
    this.tabId = tabId;
  }

  async loadUrl(url: string): Promise<boolean> {
    function loadUrl(arg: string) {
      window.location.href = arg;
    }
    await chrome.scripting.executeScript({
      args: [url],
      target: {
        tabId: this.tabId,
        allFrames: false,
      },
      func: loadUrl,
    });

    await this.asyncTimeout(1000);

    function getUrl() {
      return window.location.href;
    }
    const executedResult = await chrome.scripting.executeScript({
      target: {
        tabId: this.tabId,
        allFrames: false,
      },
      func: getUrl,
    });
    if (
      !executedResult ||
      executedResult.length == 0 ||
      executedResult[0].result !== url
    ) {
      console.warn(
        '[FetcherHelper] loadUrl - Not matched url... ',
        url,
        executedResult[0].result
      );
      return false;
    }

    return true;
  }

  async getUrl(): Promise<URL> {
    // Request to content script
    try {
      const response = await this.requestToContentScript({
        message: 'getUrl',
      });
      const url = new URL(response.result);
      console.log(`[FetcherHelper] getUrl - Response received... `, url);
      return url;
    } catch (e: any) {
      throw new Error('Could not get url...' + e.message);
    }
  }

  async getFileByUrl(
    url: string,
    headers?: { [key: string]: string }
  ): Promise<Blob> {
    // Request to content script
    try {
      const response = await this.requestToContentScript({
        message: 'getFileByUrl',
        url: url,
        headers: headers,
      });
      const blob = this.getBlobByDataUrl(response.result);
      console.log(`[FetcherHelper] getFileByUrl - Response received... `, blob);
      return blob;
    } catch (e: any) {
      throw new Error('Could not get file...' + e.message);
    }
  }

  async getTitle(): Promise<string> {
    // Request to content script
    try {
      const response = await this.requestToContentScript({
        message: 'getTitle',
      });
      const title = response.result;
      console.log(`[FetcherHelper] getTitle - Response received... `, title);
      return title;
    } catch (e: any) {
      throw new Error('Could not get title...' + e.message);
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
    for (let i = 0; i < 10; i++) {
      try {
        const response = await this.requestToContentScript({
          message: 'clickElement',
          selector: selector,
        });
        console.log(
          `[FetcherHelper] clickElement - Response received... `,
          response
        );
        break;
      } catch (e: any) {
        if (e.message.match(/Element not found/)) {
          console.warn(
            '[FetcherHelper] clickElement - Element not found... Retrying...'
          );
          await this.asyncTimeout(100);
          continue;
        }
        window.alert('Error: ' + e.message);
        break;
      }
    }
  }

  async setElementAttribute(
    selector: string,
    attribute: string,
    value: string
  ): Promise<void> {
    for (let i = 0; i < 10; i++) {
      try {
        const response = await this.requestToContentScript({
          message: 'setElementAttribute',
          selector: selector,
          attribute: attribute,
          value: value,
        });
        console.log(
          `[FetcherHelper] setElementAttribute - Response received... `,
          response
        );
        break;
      } catch (e: any) {
        if (e.message.match(/Element not found/)) {
          console.warn(
            '[FetcherHelper] setElementAttribute - Element not found... Retrying...'
          );
          await this.asyncTimeout(100);
          continue;
        }
        window.alert('Error: ' + e.message);
        break;
      }
    }
  }

  async printAsImage(): Promise<string> {
    // Request to content script
    try {
      const response = await this.requestToContentScript({
        message: 'printAsImage',
      });
      console.log(
        `[FetcherHelper] printAsImage - Response received... `,
        response
      );
      return response.result;
    } catch (e: any) {
      throw new Error('Could not get image...' + e.message);
    }
  }

  private async requestToContentScript(
    args: any,
    count: number = 1
  ): Promise<any> {
    const MAX_NUM_OF_RETRY = 5;

    const response = await this.sendMessageToContentScript(args);
    if (!response) {
      if (MAX_NUM_OF_RETRY <= count) {
        console.warn(
          '[FetcherHelper] requestToContentScript - Connection with Content Script is rejected'
        );
        return null;
      }

      // Retrying
      console.warn(
        `[FetcherHelper] requestToContentScript - Retrying (${
          count + 1
        }) because the connection with Content Script is rejected`
      );
      await this.asyncTimeout(500 * (count + 1));
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
      chrome.tabs.sendMessage(this.tabId, args, (response: any) => {
        resolve(response);
      });
    });
  }

  async getBillingListByTableElem({
    tableElem,
    billingIdColumn,
    summaryTextColumn,
    totalPriceTextColumn,
    currencyCode,
  }: {
    tableElem: string | Element;
    billingIdColumn: string | ((row: Element) => string | null) | number;
    summaryTextColumn: string | ((row: Element) => string | null) | number;
    totalPriceTextColumn: string | ((row: Element) => string | null) | number;
    currencyCode: string | 'JPY' | 'USD';
  }): Promise<BillingSummary[]> {
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
        priceCurrency: currencyCode,
      });
    }

    return billingList;
  }

  async asyncTimeout(msec: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, msec);
    });
  }

  getBlobByDataUrl(dataUrl: string) {
    const BASE64_MARKER = ';base64,';
    const base64Index = dataUrl.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    const dataUrlHeader = dataUrl.substring(0, base64Index);
    const dataUrlHeaderMatches = dataUrlHeader.match(/data:([a-z\/]+);base64,/);
    if (!dataUrlHeaderMatches) {
      throw new Error('Could not get the header from DataURL.');
    }
    const mime = dataUrlHeaderMatches[1];
    const raw = window.atob(dataUrl.substring(base64Index));
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      arr[i] = raw.charCodeAt(i);
    }
    const blob = new Blob([arr], { type: mime });
    return blob;
  }
}
