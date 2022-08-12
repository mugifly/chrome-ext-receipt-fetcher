import { EsaIoFetcher } from './esa-io.fetcher';
import { HerokuFetcher } from './heroku.fetcher';

export const Fetchers: { [key: string]: any } = {
  esaIo: EsaIoFetcher,
  heroku: HerokuFetcher,
};
