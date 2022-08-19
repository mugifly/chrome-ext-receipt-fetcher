import * as html2canvas from 'html2canvas';

class ContentScript {
  public async initialize() {
    // Set event listener for communication between content script and popup script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.onMessageFromPopup(request, sender, sendResponse);

      // Return true to indicate that the response is asynchronous.
      return true;
    });
  }

  private async onMessageFromPopup(
    request: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) {
    switch (request.message) {
      case 'getUrl':
        console.log(
          `[ContentScript] onMessageFromPopup - Getting url...`,
          document.location.href
        );
        return sendResponse({
          message: 'getUrl',
          result: document.location.href,
        });

      case 'getFileByUrl':
        console.log(
          `[ContentScript] onMessageFromPopup - Getting file by url...`,
          request
        );

        try {
          const fetchResult = await fetch(request.url, {
            method: 'GET',
            headers: request.headers || undefined,
          });
          const blob = await fetchResult.blob();

          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result);
            };
            reader.onerror = (error) => {
              reject(error);
            };
            reader.readAsDataURL(blob);
          });
          sendResponse({
            message: 'getFileByUrl',
            result: dataUrl,
          });
        } catch (e: any) {
          sendResponse({
            message: 'getFileByUrl',
            error: e.message,
          });
        }
        break;

      case 'getContent':
        console.log(`[ContentScript] onMessageFromPopup - Getting content...`);
        return sendResponse({
          message: 'getContent',
          result: document.body.outerHTML,
        });

      case 'getTitle':
        console.log(
          `[ContentScript] onMessageFromPopup - Getting title...`,
          document.title
        );
        return sendResponse({
          message: 'getTitle',
          result: document.title,
        });

      case 'clickElement':
        console.log(
          `[ContentScript] onMessageFromPopup - Clicking element...`,
          request.selector
        );
        {
          const element = document.querySelector(request.selector);
          if (!element) {
            return sendResponse({
              message: 'clickElement',
              error: 'Element not found',
            });
          }
          element.click();
          return sendResponse({
            message: 'clickElement',
          });
        }

      case 'setElementAttribute':
        console.log(
          `[ContentScript] onMessageFromPopup - Set attribute to element...`,
          request.selector,
          request.attribute,
          request.value
        );
        {
          const element = document.querySelector(request.selector);
          if (!element) {
            return sendResponse({
              message: 'setElementAttribute',
              error: 'Element not found',
            });
          }
          element.setAttribute(request.attribute, request.value);
          return sendResponse({
            message: 'setElementAttribute',
          });
        }

      case 'printAsImage':
        console.log(
          `[ContentScript] onMessageFromPopup - Printing page as image...`
        );
        // @ts-ignore
        const canvas = await html2canvas(document.body, {
          backgroundColor: '#ffffff',
          letterRendering: 1,
        });
        const imgData = canvas.toDataURL('image/png');
        console.log(
          `[ContentScript] onMessageFromPopup - Printed page as image`
        );
        sendResponse({
          message: 'printAsImage',
          result: imgData,
        });
        break;

      default:
        console.warn(
          `[ContentScript] onMessageFromPopup - Invalid request = `,
          request
        );
        sendResponse({
          message: 'invalid',
        });
    }
  }
}

window.addEventListener('load', async () => {
  const contentScript = new ContentScript();
  await contentScript.initialize();
});
