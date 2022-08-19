import { EsaIoFetcher } from './esa-io.fetcher';
import { GithubFetcher } from './github.fetcher';
import { HerokuFetcher } from './heroku.fetcher';
import { IftttFetcher } from './ifttt.fetcher';

export const Fetchers: { [key: string]: any } = {
  esaIo: EsaIoFetcher,
  heroku: HerokuFetcher,
  github: GithubFetcher,
  ifttt: IftttFetcher,
};
