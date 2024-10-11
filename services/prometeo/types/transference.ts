export interface TransferRequest {
  approved: boolean;
  authorization_devices: {
    data: string[] | null;
    type: string;
  };
  message: string | null;
  request_id: string;
}
