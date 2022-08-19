import { BillingSummary } from 'src/fetcher/interface/fetcher.interface';

export interface BillingItem extends BillingSummary {
  hasSavedImage: boolean;
}
