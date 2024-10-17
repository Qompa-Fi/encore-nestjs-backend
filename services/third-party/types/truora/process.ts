// Created based on 'Digital Identity Validation' flow.
export interface ProcessResult {
  process_id: string;
  account_id: string;
  client_id: string;
  flow_id: string;
  document_number: string;
  first_name: string;
  last_name: string;
  created_via: string;
  flow_version: number;
  country: string;
  status: string;
  failure_status: string;
  declined_reason: string;
  validations: Validation[];
  // last_finished_step: LastFinishedStep;
  creation_date: string;
  update_date: string;
  ip_address: string;
  devices_info: DevicesInfo[];
  // trigger_info: TriggerInfo;
  time_to_live: number;
  current_step_index: number;
}

export interface Validation {
  validation_id: string;
  ip_address: string;
  account_id: string;
  type: string;
  validation_status: string;
  creation_date: string;
  details: Details;
  identity_process_id: string;
  attachment_status?: string;
  attachment_validations?: AttachmentValidation[];
  remaining_retries?: number;
  front_image: string;
  failure_status?: string;
  declined_reason?: string;
  threshold?: number;
  face_photo?: string;
  face_photo_watermark?: string;
}

export interface Details {
  document_details?: DocumentDetails;
  document_validations?: DocumentValidations;
  face_recognition_validations?: FaceRecognitionValidations;
}

export interface DocumentDetails {
  client_id: string;
  country: string;
  doc_id: string;
  document_type: string;
  creation_date: string;
  date_of_birth: string;
  document_number: string;
  expiration_date: string;
  gender: string;
  last_name: string;
  machine_readable: string;
  mime_type: string;
  name: string;
  update_date: string;
}

export interface DocumentValidations {
  data_consistency: DataConsistency[];
}

export interface DataConsistency {
  validation_name: string;
  result: string;
  validation_type: string;
  message: string;
  manually_reviewed: boolean;
  created_at: string;
}

export interface FaceRecognitionValidations {
  enrollment_id: string;
  similarity_status: string;
  age_range: AgeRange;
  confidence_score: number;
  passive_liveness_status: string;
  face_search: FaceSearch;
}

export interface AgeRange {
  high: number;
  low: number;
}

export interface FaceSearch {
  status: string;
  confidence_score: number;
}

export interface AttachmentValidation {
  validation_name: string;
  validation_type: string;
  attachment_type: string;
  result: string;
}

export interface VerificationOutput {
  status: string;
  media_uploaded: boolean;
  step_data_received: boolean;
}

export interface DevicesInfo {
  model: string;
  type: string;
  os: string;
  os_version: string;
  browser: string;
  browser_version: string;
}
