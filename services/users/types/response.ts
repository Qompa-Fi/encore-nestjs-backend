import type { SerializableUser } from "../interfaces/serializable-user.interface";
import type { UserStatus } from "./status";

export interface GetUserResponse {
  user: SerializableUser;
}

export type CreateUserResponse = GetUserResponse;

export type UpdateUserResponse = GetUserResponse;

export interface ExistsByIDResponse {
  userExists: boolean;
}

export interface CheckUserStatusResponse {
  status: UserStatus;
}
