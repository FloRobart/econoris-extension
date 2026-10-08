export type OperationType = 'EXPENSE' | 'INCOME';

/* Corps attendu par POST /operations (Econoris_server, OperationsInsertSchema) */
export interface CreateOperationDto {
  /* Date de prélèvement au format AAAA-MM-JJ */
  levy_date: string;
  label: string;
  /* Négatif pour une dépense, positif pour un revenu */
  amount: number;
  category: string;
  is_validate: boolean;
}

export interface OperationDto extends CreateOperationDto {
  id: number;
  user_id: number;
}
