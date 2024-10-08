export interface PrometeoCredentials {
  username: string;
  password: string;
  additionalFields?: Record<string, string>; // !weak point (some providers might not be supported due to this)
}
