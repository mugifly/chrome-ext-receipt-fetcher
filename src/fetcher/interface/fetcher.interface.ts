export interface BillingSummary {
  id: string;
  summaryText: string;
  totalPrice: number | null;
  priceCurrency?: string;
  linkUrl?: string;
}

export interface BillingDetail {
  id: string;
  summaryText: string;
  totalPrice: number;
  taxPrice: number;
  taxPercentage: number;
  priceCurrency?: string;
  startDate: string;
  endDate: string;
}

export interface FetcherInterface {
  getBillingList(): Promise<BillingSummary[] | null>;
  getBillingEvidence(item: BillingSummary): Promise<Blob>;
}
