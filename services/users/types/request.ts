import type { UpdateUserInputs } from "./inputs";

export interface CreateUserParams {
  acceptTermsAndPrivacyPolicy: boolean;
}

export type UpdateUserParams = UpdateUserInputs;

export interface ExistsByIDParams {
  id: number;
}
