declare global {
  interface UserUnsafeMetadata {}

  interface UserPublicMetadata {
    accepts_tyc: boolean | undefined;
    internal_user_id: number | undefined;
  }
}

export type { UserPublicMetadata };
