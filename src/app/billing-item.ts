import { BillingSummary } from 'src/fetcher/fetcher.interface';

export interface BillingItem extends BillingSummary {
  hasSavedImage: boolean;
}
