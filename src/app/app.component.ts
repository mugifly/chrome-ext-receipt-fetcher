import { Component, NgZone, OnInit } from '@angular/core';
import { Fetchers } from '../fetcher';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  fetchers: any[] = [];
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

  async runFetcher(fetcherKey: any) {
    // Initialize fetcher
    const fetcher = new Fetchers[fetcherKey]({
      teamName: 'mugifly', // TODO
    });

    // Get billing list
    console.log(`[AppComponent] runFetcher - Request getting billing list...`);
    const billingList = await fetcher.getBillingList();
    this.ngZone.run(() => {
      this.fetchers[
        this.fetchers.findIndex((fetcher) => fetcher.key === fetcherKey)
      ].billingItems = billingList;
    });
  }
}
