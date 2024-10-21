import type { CreateOrganizationParams } from "../types/request";
import { TEAM_SIZES } from "../types/team-size";
import { checkRuc } from "@/lib/sunat";

export const checkCreateOrganizationParams = (
  dto: CreateOrganizationParams,
  validRubroIds: string[],
): string | null => {
  const errorMessage = checkRuc(dto.ruc);
  if (errorMessage) return errorMessage;

  if (!dto.name) return "name is required";
  if (dto.name.length < 3) {
    return "company name must be at least 3 characters";
  }

  if (!dto.category) return "category is required";

  if (!validRubroIds.includes(dto.category)) {
    return `category is not between the following rubros: ${validRubroIds.join(", ")}`;
  }

  if (!dto.size) return "size is required";

  if (!TEAM_SIZES.includes(dto.size)) {
    return `size must be one of the following values: ${TEAM_SIZES.join(", ")}`;
  }

  return null;
};
