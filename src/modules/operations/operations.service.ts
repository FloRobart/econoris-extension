import { DataApiClient } from '../../core/data.api';
import type { CreateOperationDto, OperationDto } from './operations.types';

export class OperationsService {
  static async create(dto: CreateOperationDto): Promise<OperationDto> {
    return DataApiClient.request<OperationDto>('/operations', {
      method: 'POST',
      body: dto,
      authenticated: true
    });
  }
}
