import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timeout, catchError, map } from 'rxjs';

/**
 * Сервис для обработки файловых URL различных хранилищ
 * Обеспечивает преобразование ссылок на файлохранилища в прямые ссылки для загрузки
 */
@Injectable({
  providedIn: 'root'
})
export class FileUrlProcessorService {

  // Timeout для загрузки файлов (30 секунд)
  private readonly LOAD_TIMEOUT = 30000;

  // Timeout для проверки доступности URL (5 секунд)
  private readonly CHECK_TIMEOUT = 5000;

  constructor(private http: HttpClient) {}

  /**
   * Обработать URL и получить прямую ссылку для загрузки
   * @param url - Исходный URL
   * @returns Observable<string> - Прямая ссылка для загрузки
   */
  processFileUrl(url: string): Observable<string> {
    console.log('[FileUrlProcessor] Processing URL:', url);

    // Определяем тип URL и обрабатываем соответствующим образом
    if (this.isGoogleDriveUrl(url)) {
      return this.processGoogleDriveUrl(url);
    } else if (this.isDropboxUrl(url)) {
      return this.processDropboxUrl(url);
    } else if (this.isOneDriveUrl(url)) {
      return this.processOneDriveUrl(url);
    } else {
      // Прямая ссылка - проверяем доступность
      return this.checkUrlAvailability(url);
    }
  }

  /**
   * Проверить доступность URL
   * @param url - URL для проверки
   * @returns Observable<string> - URL если доступен
   */
  private checkUrlAvailability(url: string): Observable<string> {
    return this.http.head(url, {
      observe: 'response',
      responseType: 'text'
    }).pipe(
      timeout(this.CHECK_TIMEOUT),
      map(response => {
        if (response.status >= 200 && response.status < 400) {
          return url;
        } else {
          throw new Error(`URL not accessible: ${response.status}`);
        }
      }),
      catchError(error => this.handleUrlError(error, url))
    );
  }

  /**
   * Обработать Google Drive URL
   * @param url - Google Drive URL
   * @returns Observable<string> - Прямая ссылка для загрузки
   */
  private processGoogleDriveUrl(url: string): Observable<string> {
    try {
      const urlObj = new URL(url);

      // Проверяем, является ли это уже прямой ссылкой drive.usercontent.google.com
      if (urlObj.hostname === 'drive.usercontent.google.com' &&
          urlObj.searchParams.get('export') === 'download') {
        console.log('[FileUrlProcessor] Already a direct Google Drive download URL');
        return this.checkUrlAvailability(url);
      }

      // Извлекаем ID файла из различных форматов Google Drive URL
      let fileId: string | null = null;

      // Формат: /file/d/{fileId}/view
      const fileMatch = urlObj.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileMatch) {
        fileId = fileMatch[1];
      }

      // Формат: /open?id={fileId}
      if (!fileId) {
        const idMatch = urlObj.searchParams.get('id');
        if (idMatch) {
          fileId = idMatch;
        }
      }

      if (!fileId) {
        throw new Error('Cannot extract file ID from Google Drive URL');
      }

      // Создаем прямую ссылку для загрузки в новом формате
      const directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;

      console.log('[FileUrlProcessor] Google Drive direct URL:', directUrl);
      return this.checkUrlAvailability(directUrl);

    } catch (error) {
      console.error('[FileUrlProcessor] Google Drive URL processing error:', error);
      return throwError(() => new Error(`Invalid Google Drive URL: ${error}`));
    }
  }

  /**
   * Обработать Dropbox URL
   * @param url - Dropbox URL
   * @returns Observable<string> - Прямая ссылка для загрузки
   */
  private processDropboxUrl(url: string): Observable<string> {
    try {
      const urlObj = new URL(url);

      // Проверяем, есть ли уже параметр dl=1 (прямая загрузка)
      if (urlObj.searchParams.get('dl') === '1') {
        return this.checkUrlAvailability(url);
      }

      // Добавляем параметр dl=1 для прямой загрузки
      urlObj.searchParams.set('dl', '1');
      const directUrl = urlObj.toString();

      console.log('[FileUrlProcessor] Dropbox direct URL:', directUrl);
      return this.checkUrlAvailability(directUrl);

    } catch (error) {
      console.error('[FileUrlProcessor] Dropbox URL processing error:', error);
      return throwError(() => new Error(`Invalid Dropbox URL: ${error}`));
    }
  }

  /**
   * Обработать OneDrive URL
   * @param url - OneDrive URL
   * @returns Observable<string> - Прямая ссылка для загрузки
   */
  private processOneDriveUrl(url: string): Observable<string> {
    try {
      const urlObj = new URL(url);

      // Проверяем, есть ли уже параметр download=1
      if (urlObj.searchParams.get('download') === '1') {
        return this.checkUrlAvailability(url);
      }

      // Добавляем параметр download=1 для прямой загрузки
      urlObj.searchParams.set('download', '1');
      const directUrl = urlObj.toString();

      console.log('[FileUrlProcessor] OneDrive direct URL:', directUrl);
      return this.checkUrlAvailability(directUrl);

    } catch (error) {
      console.error('[FileUrlProcessor] OneDrive URL processing error:', error);
      return throwError(() => new Error(`Invalid OneDrive URL: ${error}`));
    }
  }

  /**
   * Проверить, является ли URL ссылкой на Google Drive
   * @param url - URL для проверки
   * @returns boolean
   */
  private isGoogleDriveUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('drive.google.com') ||
             urlObj.hostname === 'drive.usercontent.google.com';
    } catch {
      return false;
    }
  }

  /**
   * Проверить, является ли URL ссылкой на Dropbox
   * @param url - URL для проверки
   * @returns boolean
   */
  private isDropboxUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('dropbox.com');
    } catch {
      return false;
    }
  }

  /**
   * Проверить, является ли URL ссылкой на OneDrive
   * @param url - URL для проверки
   * @returns boolean
   */
  private isOneDriveUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('onedrive.live.com') ||
             urlObj.hostname.includes('1drv.ms');
    } catch {
      return false;
    }
  }

  /**
   * Обработать ошибку URL
   * @param error - Ошибка
   * @param originalUrl - Исходный URL
   * @returns Observable<never>
   */
  private handleUrlError(error: HttpErrorResponse, originalUrl: string): Observable<never> {
    console.error('[FileUrlProcessor] URL error:', error);

    let errorMessage = 'Failed to load file from URL';

    if (error.status === 404) {
      errorMessage = 'File not found at the specified URL';
    } else if (error.status === 403) {
      errorMessage = 'Access denied to the file URL';
    } else if (error.status === 0) {
      errorMessage = 'Network error or CORS restriction';
    } else if ((error as any).name === 'TimeoutError') {
      errorMessage = 'Request timeout - file URL is not responding';
    }

    return throwError(() => new Error(`${errorMessage}: ${originalUrl}`));
  }

  /**
   * Получить информацию о поддерживаемых файлохранилищах
   * @returns string[]
   */
  getSupportedStorageServices(): string[] {
    return ['Google Drive', 'Dropbox', 'OneDrive', 'Direct URLs'];
  }
}
