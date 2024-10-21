export const isValidDNI = (number: string): boolean =>
  /^[0-9]{8}$/.test(number);

export const isValidPassport = (number: string): boolean =>
  /^(?!^0+$)[a-zA-Z0-9]{3,20}$/.test(number);

export const isValidImmigrationCard = (number: string): boolean =>
  /^[0-9]{12}$/.test(number);
