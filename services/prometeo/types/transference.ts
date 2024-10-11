export interface TransferRequest {
  approved: boolean;
  // The methods that the user can use to authorize the transfer
  // in the next API call.
  authorization_devices: {
    data: string[] | null;
    type: string;
  };
  message: string | null;
  // The ID that identifies the transfer request. It must be supplied
  // in the next API call to confirm the transfer.
  request_id: string;
}
