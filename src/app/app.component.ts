import { Component, NgZone, OnInit } from '@angular/core';
import { FetcherHelper } from 'src/fetcher/helper';
import { Fetchers } from '../fetcher';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  fetchers: any[] = [];
  openedTab: chrome.tabs.Tab | undefined = undefined;
  objectKeys = Object.keys;

  constructor(private ngZone: NgZone) {}

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
    for (const fetcher of this.fetchers) {
      await this.runFetcher(fetcher.key);
    }
  }

  async runFetcher(fetcherKey: any) {
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
    const fetcher = new Fetchers[fetcherKey](
      {
        teamName: 'mugifly', // TODO
      },
      fetcherHelper
    );

    // Get billing list
    console.log(`[AppComponent] runFetcher - Request getting billing list...`);
    const billingList = await fetcher.getBillingList();
    this.ngZone.run(() => {
      this.fetchers[
        this.fetchers.findIndex((fetcher) => fetcher.key === fetcherKey)
      ].billingItems = billingList;
    });

    // Done
    console.log(`[AppComponent] runFetcher - Done.`);
  }

  openOptions() {
    chrome.runtime.openOptionsPage();
  }
}
