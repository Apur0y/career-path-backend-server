export interface ITransactionHistory {
  id: string;
  paymentDate: Date;
  planName: string;
  planDescription: string;
  userName: string;
  email: string;
  payType: string;
  billingStatus: "Active" | "Inactive";
  amount: number;
  currency: string;
}

export interface ITransactionHistoryQuery extends Record<string, unknown> {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  userId?: string;
  planType?: string;
  billingStatus?: "Active" | "Inactive";
}
