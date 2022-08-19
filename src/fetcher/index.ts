import { EsaIoFetcher } from './esa-io.fetcher';
import { GithubFetcher } from './github.fetcher';
import { HerokuFetcher } from './heroku.fetcher';

export const Fetchers: { [key: string]: any } = {
  esaIo: EsaIoFetcher,
  heroku: HerokuFetcher,
  github: GithubFetcher,
};
