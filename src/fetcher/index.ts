import { EsaIoFetcher } from './esa-io.fetcher';
import {
  BillingSummary,
  BillingDetail,
  FetcherInterface,
} from './fetcher.interface';
import { HerokuFetcher } from './heroku.fetcher';

export const Fetchers: { [key: string]: any } = {
  '.*.esa.io/.*': EsaIoFetcher,
  '.*.heroku.com/.*': HerokuFetcher,
};
