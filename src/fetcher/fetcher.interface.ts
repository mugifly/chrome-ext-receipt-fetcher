export interface BillingSummary {
  id: string;
  summaryText: string;
  totalPrice: number | null;
  priceCurrency?: string;
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

  getBillingDetail(id: string): Promise<BillingDetail | null>;

  getBillingDetailAsImage(id: string): Promise<string>;
}
