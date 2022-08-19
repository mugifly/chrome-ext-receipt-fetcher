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

    try {
      for (const serviceSetting of this.serviceSettings) {
        numOfItems += (await this.getBillingList(serviceSetting.id)) || 0;

        numOfServiceSettings++;
      }
    } catch (e: any) {
      if (e instanceof UserActionRequiredException) {
        return;
      }
      console.warn(e);
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
        throw e;
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

    const evidenceFileType =
      this.getFetcherClassByServiceSettingId(
        serviceSettingId
      ).getEvidenceFileType();

    let saveFileName: string;

    try {
      console.log(
        `[AppComponent] saveBillingEvidence - Request getting billing evidence...`
      );
      const blob: Blob = await fetcherInstance.getBillingEvidence(
        billingItem.id
      );

      let extension;
      switch (blob.type) {
        case 'image/png':
          extension = `.png`;
          break;
        case 'application/pdf':
          extension = `.pdf`;
          break;
        default:
          extension = '';
      }

      saveFileName = `${fetcherServiceName}_${billingItem.id}_${
        billingItem.summaryText
      }_${billingItem.priceCurrency || ''}_${
        billingItem.totalPrice
      }.${extension}`;

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
    const fetcherClass =
      this.getFetcherClassByServiceSettingId(serviceSettingId);
    if (!fetcherClass) return '-';
    return fetcherClass.getName();
  }

  private getFetcherClassByServiceSettingId(serviceSettingId: string): any {
    const serviceSetting = this.serviceSettings.find(
      (x) => x.id === serviceSettingId
    );
    if (!serviceSetting) return null;
    return Fetchers[serviceSetting.fetcherKey];
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
