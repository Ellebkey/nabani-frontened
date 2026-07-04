import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { MagueyLoadingService } from '@maguey/services/loading/loading.service';
import { finalize, Observable } from 'rxjs';

export const magueyLoadingInterceptor = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> =>
{
    const magueyLoadingService = inject(MagueyLoadingService);

    // If the Auto mode is turned off, do nothing
    if ( !magueyLoadingService.autoMode )
    {
        return next(req);
    }

    // Set the loading status to true
    magueyLoadingService._setLoadingStatus(true, req.url);

    return next(req).pipe(
        finalize(() =>
        {
            // Set the status to false if there are any errors or the request is completed
            magueyLoadingService._setLoadingStatus(false, req.url);
        }));
};
