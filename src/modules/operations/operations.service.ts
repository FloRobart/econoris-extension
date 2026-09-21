import { DataApiClient } from '../../core/data.api';
import { CreateOperationDto } from './operations.types';

export class OperationsService {
  static async create(dto: CreateOperationDto): Promise<void> {
    await DataApiClient.request<void>('/operations', {
      method: 'POST',
      body: JSON.stringify(dto)
    });
  }
}