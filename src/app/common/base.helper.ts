export class BaseHelper {
  protected tabId: number;

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

  async getFileByUrl({
    url,
    headers,
    mode,
  }: {
    url: string;
    headers?: { [key: string]: string };
    mode?: 'no-cors' | 'cors';
  }): Promise<Blob> {
    // Request to content script
    try {
      if (!mode || mode === 'cors') {
        const response = await this.requestToContentScript({
          message: 'getFileByUrl',
          url: url,
          headers: headers,
        });
        const blob = this.getBlobByDataUrl(response.result);
        console.log(
          `[FetcherHelper] getFileByUrl - Response received (content script)... `,
          blob
        );
        return blob;
      } else {
        const response = await fetch(url, {
          headers: headers,
        });
        if (400 <= response.status) {
          throw new Error(response.statusText);
        }
        const blob = await response.blob();
        console.log(
          `[FetcherHelper] getFileByUrl - Response received (fetch)... `,
          blob
        );
        return blob;
      }
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
