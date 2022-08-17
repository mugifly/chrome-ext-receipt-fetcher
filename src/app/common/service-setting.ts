export interface ServiceSetting {
  id: string;
  fetcherKey: string;
  setting: { [key: string]: string };
}
