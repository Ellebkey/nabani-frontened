import { HttpParams } from '@angular/common/http';
import { Query } from '@app/modules/shared/interfaces/shared.model';
import { environment } from '@root/environments/environment';

export abstract class HttpHelpersService {
  protected API_URL = environment.url;

  protected createHttpParams(query: Query): HttpParams {
    let params = new HttpParams();
    Object.keys(query).forEach(key => {
      if (query[key] !== null && query[key] !== undefined && query[key] !== '') {
        params = params.append(key, query[key]);
      }
    });
    return params;
  }

}
