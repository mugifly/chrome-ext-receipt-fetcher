import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Fetchers } from 'src/fetcher';
import { ServiceSetting } from '../common/service-setting';
import { SettingService } from '../setting.service';
import { AddServiceDialogComponent } from './add-service-dialog/add-service-dialog.component';

@Component({
  selector: 'app-options',
  templateUrl: './options.component.html',
  styleUrls: ['./options.component.scss'],
})
export class OptionsComponent implements OnInit {
  serviceSettings: ServiceSetting[] = [];

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private settingService: SettingService
  ) {}

  async ngOnInit() {
    await this.loadSettings();
  }

  async loadSettings() {
    this.serviceSettings = await this.settingService.getSettings();
  }

  async openAddServiceDialog() {
    const result = await this.dialog
      .open(AddServiceDialogComponent, {
        data: {},
      })
      .afterClosed()
      .toPromise();

    await this.addSetting(result.fetcherKey);
  }

  async addSetting(fetcherKey: string) {
    const fetcherClass = Fetchers[fetcherKey];
    const serviceName = fetcherClass.getName();

    await this.settingService.addSetting(fetcherKey);

    this.snackBar.open(`${serviceName} を追加しました`, undefined, {
      duration: 1000,
    });

    await this.loadSettings();
  }

  async deleteSetting(id: string) {
    const item = this.serviceSettings.find((x) => x.id === id);
    if (!item) return;

    await this.settingService.deleteSetting(id);

    this.snackBar.open(
      `${this.getServiceNameByFetcherKey(item?.fetcherKey)} を削除しました`,
      undefined,
      {
        duration: 1000,
      }
    );
    await this.loadSettings();
  }

  async onInputChange(id: string, event: any) {
    await this.settingService.updateSetting(
      id,
      this.serviceSettings.find((x) => x.id === id)?.setting
    );
  }

  getServiceNameByFetcherKey(fetcherKey: string) {
    const fetcherClass = Fetchers[fetcherKey];
    if (!fetcherClass) return '-';
    return fetcherClass.getName();
  }
}
