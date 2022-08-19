import { BillingSummary } from '../common/billing-summary';

export interface BillingItem extends BillingSummary {
  hasSavedImage: boolean;
}
