import { Injectable } from '@angular/core';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { MagueyConfirmationConfig } from '@root/@maguey/services/confirmation';

@Injectable({
  providedIn: 'root'
})
export class CommonService {

  getMonthDateRange(): { startDate: string, endDate: string } {
    const now = new Date();
    return {
      startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd')
    };
  }

  formatToISO(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  combineDateAndTime(date: Date, time: string): string {
    if (!date || !time) {
      return '';
    }

    const [hours, minutes] = time.split(':').map(Number);
    const combinedDate = new Date(date);
    combinedDate.setHours(hours, minutes, 0, 0);
    
    // Return ISO string for consistent timezone handling in backend
    return combinedDate.toISOString();
  }

  getDefaultDeleteConfirmation(config: { objectName: string }): MagueyConfirmationConfig {
    return {
      title: `Remove ${config.objectName}`,
      message: `Are you sure you want to remove this ${config.objectName} permanently? <span class="font-medium">This action cannot be undone!</span>`,
      icon: {
        show: true,
        name: 'heroicons_outline:exclamation-triangle',
        color: 'warn'
      },
      actions: {
        confirm: {
          show: true,
          label: 'Remove',
          color: 'warn'
        },
        cancel: {
          show: true,
          label: 'Cancel'
        }
      },
      dismissible: false
    }
  }

}
