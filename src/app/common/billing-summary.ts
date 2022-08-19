export interface BillingSummary {
  id: string;
  summaryText: string;
  totalPrice: number | null;
  priceCurrency?: string;
  linkUrl?: string;
}
