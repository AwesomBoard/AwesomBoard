import { formatDate } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'timestamp' })
export class TimestampPipe implements PipeTransform {
    public transform(timestamp: number): string | null {
        return formatDate(timestamp * 1000, 'HH:mm:ss', 'en-US');
    }
}
