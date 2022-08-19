import { BillingSummary } from './billing-summary';

export interface Fetcher {
  getBillingList(): Promise<BillingSummary[] | null>;
  getBillingEvidence(item: BillingSummary): Promise<Blob>;
}
