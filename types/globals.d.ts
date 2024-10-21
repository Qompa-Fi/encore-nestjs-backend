declare global {
  interface UserUnsafeMetadata {}

  interface UserPublicMetadata {
    acceptTermsAndPrivacyPolicy: boolean | undefined;
    internalUserId: number | undefined;
  }
}

export type { UserPublicMetadata };
