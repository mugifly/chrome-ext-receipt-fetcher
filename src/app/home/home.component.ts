import { Component, NgZone, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Fetchers } from 'src/fetcher';
import { UserActionRequiredException } from 'src/fetcher/exception/user-action-required-exception';
import { FetcherHelper } from 'src/fetcher/helper';
import { ServiceSetting } from '../common/service-setting';
import { SettingService } from '../setting.service';
import { BillingItem } from './billing-item';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  serviceSettings: ServiceSetting[] = [];

  billingItems: {
    [key: string]: BillingItem[];
  } = {};

  openedTab: chrome.tabs.Tab | undefined = undefined;
  objectKeys = Object.keys;

  constructor(
    private snackBar: MatSnackBar,
    private ngZone: NgZone,
    private settingService: SettingService
  ) {
    console.log(window.location.href);
  }

  async ngOnInit() {
    await this.loadSettings();
  }

  async loadSettings() {
    this.serviceSettings = await this.settingService.getSettings();
  }

  async getBillingLists() {
    await this.loadSettings();

    let numOfServiceSettings = 0,
      numOfItems = 0;
    for (const serviceSetting of this.serviceSettings) {
      numOfItems += (await this.getBillingList(serviceSetting.id)) || 0;
      numOfServiceSettings++;
    }

    this.snackBar.open(
      `${numOfServiceSettings} 件のサービスから 計 ${numOfItems} 件の請求リストを取得しました`,
      undefined,
      {
        duration: 5000,
      }
    );
  }

  async getBillingList(serviceSettingId: string): Promise<number | null> {
    const fetcherServiceName =
      this.getServiceNameByServiceSettingId(serviceSettingId);

    let fetcherInstance = null;
    try {
      fetcherInstance = await this.getFetcherInstanceByServiceSettingId(
        serviceSettingId
      );
    } catch (e: any) {
      this.snackBar.open(`エラー: ${fetcherServiceName} - ${e.message}`, 'OK');
      throw e;
    }

    const message = this.snackBar.open(
      `${fetcherServiceName} から請求リストを取得しています...`
    );

    let billingList: any;
    try {
      billingList = await fetcherInstance.getBillingList();
      message.dismiss();
    } catch (e: any) {
      message.dismiss();
      this.snackBar.open(`エラー: ${fetcherServiceName} - ${e.message}`, 'OK');
      if (e instanceof UserActionRequiredException) {
        // Switch tab
        window.setTimeout(() => {
          this.switchToAutomatedTab();
        }, 1000);
      }
      return 0;
    }

    this.ngZone.run(() => {
      this.billingItems[serviceSettingId] = billingList.map(
        (billingItem: any) => {
          return {
            ...billingItem,
            hasSavedImage: false,
          };
        }
      );
    });

    // Done
    console.log(`[AppComponent] getBillingList - Done`, billingList);
    return billingList.length;
  }

  async saveBillingEvidence(
    serviceSettingId: string,
    billingItem: BillingItem
  ) {
    const fetcherServiceName =
      this.getServiceNameByServiceSettingId(serviceSettingId);

    let fetcherInstance = null;
    try {
      fetcherInstance = await this.getFetcherInstanceByServiceSettingId(
        serviceSettingId
      );
    } catch (e: any) {
      this.snackBar.open(`エラー: ${fetcherServiceName} - ${e.message}`, 'OK');
      throw e;
    }

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
      this.snackBar.open(`エラー: ${fetcherServiceName} - ${e.message}`, 'OK');
      if (e instanceof UserActionRequiredException) {
        // Switch tab
        window.setTimeout(() => {
          this.switchToAutomatedTab();
        }, 1000);
      }
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

  private getServiceNameByServiceSettingId(serviceSettingId: string): string {
    const serviceSetting = this.serviceSettings.find(
      (x) => x.id === serviceSettingId
    );
    if (!serviceSetting) return '-';
    return Fetchers[serviceSetting.fetcherKey].getName();
  }

  private async getFetcherInstanceByServiceSettingId(
    serviceSettingId: string
  ): Promise<any> {
    const serviceSetting = this.serviceSettings.find(
      (x) => x.id === serviceSettingId
    );
    if (!serviceSetting) {
      return null;
    }

    // Check the tab
    if (this.openedTab && this.openedTab.id) {
      try {
        await chrome.tabs.get(this.openedTab.id!);
      } catch (e: any) {
        console.warn(e);
        this.openedTab = undefined;
      }
    }

    // Open new tab
    if (!this.openedTab) {
      let tab = await chrome.tabs.create({
        url: 'https://mugifly.github.io/receipt-fetcher/',
        active: false,
      });
      this.openedTab = tab;
    }

    // Initialize fetcher
    const fetcherHelper = new FetcherHelper(this.openedTab.id!);
    const instance = new Fetchers[serviceSetting.fetcherKey](
      serviceSetting.setting || {},
      fetcherHelper
    );
    return instance;
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

  getServiceNameByFetcherKey(fetcherKey: string) {
    const fetcherClass = Fetchers[fetcherKey];
    if (!fetcherClass) return '-';
    return fetcherClass.getName();
  }

  switchToAutomatedTab() {
    if (!this.openedTab || !this.openedTab.id) {
      return;
    }

    chrome.tabs.update(this.openedTab.id, { highlighted: true });
  }
}
