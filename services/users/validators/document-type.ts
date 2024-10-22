import type { DocumentType } from "../types/user";

export const isValidDNI = (number: string): boolean =>
  /^[0-9]{8}$/.test(number);

export const isValidPassport = (number: string): boolean =>
  /^(?!^0+$)[a-zA-Z0-9]{3,20}$/.test(number);

export const isValidImmigrationCard = (number: string): boolean =>
  /^[0-9]{12}$/.test(number);

export const isValidDoc = (type: DocumentType, number: string): boolean => {
  if (type === "dni") {
    return isValidDNI(number);
  }

  if (type === "immigration_card") {
    return isValidImmigrationCard(number);
  }

  if (type === "passport") {
    return isValidPassport(number);
  }

  return false;
};
