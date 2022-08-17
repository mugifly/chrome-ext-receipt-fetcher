import { Component, NgZone, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FetcherHelper } from 'src/fetcher/helper';
import { Fetchers } from '../fetcher';
import { BillingItem } from './billing-item';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  fetchers: {
    serviceName: string;
    key: string;
    fetcherClass: any;
    billingItems: BillingItem[];
  }[] = [];
  openedTab: chrome.tabs.Tab | undefined = undefined;
  objectKeys = Object.keys;

  constructor(private snackBar: MatSnackBar, private ngZone: NgZone) {}

  ngOnInit(): void {
    // Load fetchers
    this.fetchers = Object.keys(Fetchers).map((key) => {
      return {
        serviceName: (Fetchers[key] as any).getName(),
        key: key,
        fetcherClass: Fetchers[key],
        billingItems: [],
      };
    });
  }

  async runAllFetchers() {
    let numOfItems = 0;
    for (const fetcher of this.fetchers) {
      numOfItems += await this.getBillingList(fetcher.key);
    }

    this.snackBar.open(`請求リストを取得しました: ${numOfItems} 件`);
  }

  async getBillingList(fetcherKey: string): Promise<number> {
    const fetcherInstance = await this.getFetcherInstance(fetcherKey);
    const fetcherServiceName = Fetchers[fetcherKey].getName();

    const message = this.snackBar.open(
      `${fetcherServiceName} から請求リストを取得しています...`
    );

    let billingList: any;
    try {
      billingList = await fetcherInstance.getBillingList();
      message.dismiss();
    } catch (e: any) {
      message.dismiss();
      this.snackBar.open(`エラー: ${e.message}`, 'OK', { duration: 3000 });
      return 0;
    }

    this.ngZone.run(() => {
      this.fetchers[
        this.fetchers.findIndex((fetcher) => fetcher.key === fetcherKey)
      ].billingItems = billingList.map((billingItem: any) => {
        return {
          ...billingItem,
          hasSavedImage: false,
        };
      });
    });

    // Done
    console.log(`[AppComponent] getBillingList - Done`, billingList);
    return billingList.length;
  }

  async saveBillingEvidence(fetcherKey: string, billingItem: BillingItem) {
    const fetcherInstance = await this.getFetcherInstance(fetcherKey);
    const fetcherServiceName = Fetchers[fetcherKey].getName();

    const message = this.snackBar.open(
      `${fetcherServiceName} から証憑を取得しています... ${billingItem.id} `
    );

    let saveFileName = `${fetcherServiceName}_${billingItem.id}_${billingItem.totalPrice}.png`;

    let imageDataUri: string;
    try {
      console.log(
        `[AppComponent] saveBillingEvidence - Request getting billing detail as image...`
      );
      imageDataUri = await fetcherInstance.getBillingDetailAsImage(
        billingItem.id
      );
      const blob = this.getBlobByDataUrl(imageDataUri);
      if (!blob) {
        throw new Error('Could not convert DataUrl to Blob');
      }
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = saveFileName;
      link.click();
      billingItem.hasSavedImage = true;
      message.dismiss();
    } catch (e: any) {
      message.dismiss();
      this.snackBar.open(`エラー: ${e.message}`, 'OK', { duration: 3000 });
      return;
    }

    // Done
    this.snackBar.open(`証憑を保存しました: ${saveFileName}`, undefined, {
      duration: 1000,
    });
  }

  openOptions() {
    chrome.runtime.openOptionsPage();
  }

  private async getFetcherInstance(fetcherKey: string): Promise<any> {
    // Open tab
    if (!this.openedTab) {
      let tab = await chrome.tabs.create({
        url: 'https://mugifly.github.io/receipt-fetcher/',
        active: false,
      });
      this.openedTab = tab;
    }

    // Initialize fetcher
    const fetcherHelper = new FetcherHelper(this.openedTab.id!);
    return new Fetchers[fetcherKey](
      {
        teamName: 'mugifly', // TODO
      },
      fetcherHelper
    );
  }

  private getBlobByDataUrl(dataUrl: string) {
    const BASE64_MARKER = ';base64,';
    const base64Index = dataUrl.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    const dataUrlHeader = dataUrl.substring(0, base64Index);
    const dataUrlHeaderMatches = dataUrlHeader.match(/data:([a-z\/]+);base64,/);
    if (!dataUrlHeaderMatches) {
      return null;
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
