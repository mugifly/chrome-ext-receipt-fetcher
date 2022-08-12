import { Fetchers } from './fetcher';
import { FetcherInterface } from './fetcher/fetcher.interface';
import { DOMParser, parseHTML } from 'linkedom';

class ContentScript {
  public async initialize() {
    // Set event listener for communication between content script and popup script
    chrome.runtime.onMessage.addListener(
      async (request, sender, sendResponse) => {
        await this.onMessageFromPopup(request, sender, sendResponse);
      }
    );
  }

  private async onMessageFromPopup(
    request: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) {
    switch (request.message) {
      case 'loadUrl':
        console.log(
          `[ContentScript] onMessageFromPopup - Loading url...`,
          request.url
        );
        await this.loadUrl(request.url);
        return sendResponse({
          message: 'loadUrl',
        });
      case 'getContent':
        console.log(`[ContentScript] onMessageFromPopup - Getting content...`);
        return sendResponse({
          message: 'getContent',
          result: document.body.outerHTML,
        });
      case 'clickElement':
        console.log(
          `[ContentScript] onMessageFromPopup - Clicking element...`,
          request.selector
        );
        const element = document.querySelector(request.selector);
        element.click();
        return sendResponse({
          message: 'clickElement',
        });
      default:
        console.log(
          `[ContentScript] onMessageFromPopup - Wrong request = `,
          request
        );
    }
  }

  private async loadUrl(url: string): Promise<void> {
    console.log(`[ContentScript] loadUrl - Loading...`, url);

    if (window.location.href.indexOf(url) !== -1) {
      console.log(`[ContentScript] Already loaded ${url}`);
      return;
    }

    return new Promise((resolve, reject) => {
      window.location.href = url;

      window.setTimeout(() => {
        if (window.location.href !== url) {
          return reject();
        }
        resolve();
      }, 5000);
    });
  }
}

window.addEventListener('load', async () => {
  const contentScript = new ContentScript();
  await contentScript.initialize();
});
