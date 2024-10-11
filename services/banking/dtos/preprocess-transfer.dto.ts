export interface PreprocessTranferDto {
  origin_account: string;
  destination_account: string;
  destination_institution: number;
  destination_owner_name?: string;
  destination_account_type?: string;
  authorization_device_number?: string;
  concept: string;
  branch?: number;
  currency: string;
  amount: number;
}
