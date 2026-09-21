export type OperationType = 'EXPENSE' | 'INCOME';

export interface CreateOperationDto {
  amount: number;
  name: string;
  category: string;
  date: string;
  type: OperationType;
}