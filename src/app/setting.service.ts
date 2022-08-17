import { Injectable } from '@angular/core';
import { Fetchers } from 'src/fetcher';
import { ServiceSetting } from './common/service-setting';

@Injectable({
  providedIn: 'root',
})
export class SettingService {
  constructor() {}

  async getSettings(): Promise<ServiceSetting[]> {
    const result = await chrome.storage.sync.get(['serviceSettings']);

    let serviceSettings: any = [];
    if (!result || !result['serviceSettings']) return [];

    for (const serviceSetting of result['serviceSettings']) {
      const fetcherClass = Fetchers[serviceSetting.fetcherKey];
      if (!fetcherClass) continue;

      serviceSettings.push({
        id: serviceSetting.id,
        fetcherKey: serviceSetting.fetcherKey,
        setting: serviceSetting.setting || {},
        serviceName: fetcherClass.getName(),
      });
    }

    // Sort with service name
    serviceSettings = serviceSettings
      .sort((a: any, b: any) => {
        return a.serviceName.localeCompare(b.serviceName);
      })
      .map((item: any) => {
        delete item['serviceName'];
        return item;
      });

    return serviceSettings;
  }

  async addSetting(fetcherKey: string): Promise<string> {
    const id = this.generateUUID();
    const serviceSettings = await this.getSettings();
    serviceSettings.push({
      id: id,
      fetcherKey: fetcherKey,
      setting: {},
    });

    await chrome.storage.sync.set({
      serviceSettings: serviceSettings,
    });

    return id;
  }

  async updateSetting(
    id: string,
    setting: { [key: string]: string } | undefined
  ) {
    const serviceSettings = await this.getSettings();
    const index = serviceSettings.findIndex((setting) => setting.id === id);
    if (index < 0) return;

    serviceSettings[index].setting = setting || {};

    await chrome.storage.sync.set({
      serviceSettings: serviceSettings,
    });
  }

  async deleteSetting(id: string): Promise<void> {
    const serviceSettings = await this.getSettings();
    const index = serviceSettings.findIndex((setting) => setting.id === id);
    if (index < 0) return;

    serviceSettings.splice(index, 1);

    await chrome.storage.sync.set({
      serviceSettings: serviceSettings,
    });
  }

  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
