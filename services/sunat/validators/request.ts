import { APIError } from "encore.dev/api";

import type { SaveSunatProfileParams } from "../types/request";

export const checkSaveSunatProfileDto = (
  dto: SaveSunatProfileParams,
): APIError | null => {
  if (!dto.solUsername) {
    return APIError.invalidArgument("solUsername is required");
  }
  if (dto.solUsername.length < 3) {
    return APIError.invalidArgument("solUsername is too short");
  }
  if (dto.solUsername.length > 8) {
    return APIError.invalidArgument("solUsername is too long");
  }

  if (!dto.solKey) return APIError.invalidArgument("solKey is required");
  if (dto.solKey.length > 12) {
    return APIError.invalidArgument("solKey is too long");
  }

  return null;
};
