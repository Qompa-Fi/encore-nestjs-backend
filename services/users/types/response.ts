import type { SerializableUser } from "../interfaces/serializable-user.interface";

export interface GetUserResponse {
  user: SerializableUser;
}

export type CreateUserResponse = GetUserResponse;

export interface ExistsByIDResponse {
  userExists: boolean;
}