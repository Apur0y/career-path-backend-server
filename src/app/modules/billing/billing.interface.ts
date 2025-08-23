export interface IBillingInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  country: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  additionalInfo?: string;
}

export interface IBillingInfoResponse {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  country: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  additionalInfo?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
