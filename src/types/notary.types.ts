export interface NotaryFormValues {
  notaryName: string;
  notaryNumber: number;
  notaryOfficerName: string;
}

export interface NotaryResponse extends NotaryFormValues {
  id: number;
  createdAt: string;
}
