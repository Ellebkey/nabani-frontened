import { Injectable } from '@angular/core';
import { PaginationSetting } from '@app/modules/shared/interfaces/shared.model';

@Injectable({
  providedIn: 'root',
})
export class PaginationService {
  getDefaultPagination(showInput = false): PaginationSetting {
    return {
      limit: 25,
      offset: 0,
      searchText: null,
      count: 0,
      showInputSearch: showInput,
    };
  }
}
