export interface TransferRequest {
  approved: boolean;
  authorization_devices: {
    data: string[];
    type: string;
  };
  message: string | null;
  request_id: string;
}
