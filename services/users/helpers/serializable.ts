import type { User as UserModel } from "@prisma/client";

import type { SerializableUser } from "../interfaces/serializable-user.interface";

export const toSerializableUser = (user: UserModel): SerializableUser => {
  const document = user.documentNumber
    ? user.documentType && {
        number: user.documentNumber,
        type: user.documentType,
      }
    : null;

  return {
    id: user.id,
    clerkId: user.clerkId,
    onboardedAt: user.onboardedAt?.toISOString(),
    document,
  };
};
