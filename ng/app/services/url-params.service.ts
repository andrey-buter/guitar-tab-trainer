import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

/**
 * Сервис для работы с URL параметрами
 * Обеспечивает парсинг и валидацию параметров загрузки файлов
 */
@Injectable({
  providedIn: 'root'
})
export class UrlParamsService {

  // Поддерживаемые расширения Guitar Pro файлов
  private readonly SUPPORTED_EXTENSIONS = ['.gp', '.gp3', '.gp4', '.gp5', '.gpx'];

  // Максимальная длина URL для безопасности
  private readonly MAX_URL_LENGTH = 2048;

  constructor(private route: ActivatedRoute) {}

  /**
   * Получить URL файла из параметров запроса
   * @returns Observable<string | null> - URL файла или null если параметр отсутствует
   */
  getGuitarProUrl(): Observable<string | null> {
    return this.route.queryParams.pipe(
      map(params => {
        // First try Angular route params
        const gtpUrl = params['gtp'];
        if (gtpUrl && typeof gtpUrl === 'string') {
          return this.validateAndCleanUrl(gtpUrl);
        }

        // Fallback to standard URL search params
        const urlParams = new URLSearchParams(window.location.search);
        const standardGtpUrl = urlParams.get('gtp');
        if (standardGtpUrl) {
          return this.validateAndCleanUrl(standardGtpUrl);
        }

        return null;
      }),
      take(1) // Берем только первое значение
    );
  }

  /**
   * Проверить наличие параметра gtp в URL
   * @returns Observable<boolean>
   */
  hasGuitarProUrl(): Observable<boolean> {
    return this.getGuitarProUrl().pipe(
      map(url => url !== null)
    );
  }

  /**
   * Валидировать и очистить URL
   * @param url - Исходный URL
   * @returns string | null - Валидный URL или null
   */
  private validateAndCleanUrl(url: string): string | null {
    try {
      // Проверка длины URL
      if (url.length > this.MAX_URL_LENGTH) {
        console.warn('[UrlParamsService] URL too long:', url.length);
        return null;
      }

      // Декодирование URL
      const decodedUrl = decodeURIComponent(url);

      // Создание объекта URL для валидации
      const urlObj = new URL(decodedUrl);

      // Проверка схемы (только http/https)
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        console.warn('[UrlParamsService] Invalid protocol:', urlObj.protocol);
        return null;
      }

      // Проверка расширения файла (если есть)
      const pathname = urlObj.pathname.toLowerCase();
      const hasValidExtension = this.SUPPORTED_EXTENSIONS.some(ext =>
        pathname.endsWith(ext)
      );

      // Если расширение не найдено, но URL выглядит как ссылка на файл, все равно разрешаем
      // (может быть ссылка на файлохранилище без расширения в пути)
      if (!hasValidExtension && !this.looksLikeFileStorageUrl(decodedUrl)) {
        console.warn('[UrlParamsService] No valid Guitar Pro extension found:', pathname);
        // Не блокируем, так как может быть ссылка на файлохранилище
      }

      return decodedUrl;
    } catch (error) {
      console.error('[UrlParamsService] URL validation error:', error);
      return null;
    }
  }

  /**
   * Проверить, выглядит ли URL как ссылка на файлохранилище
   * @param url - URL для проверки
   * @returns boolean
   */
  private looksLikeFileStorageUrl(url: string): boolean {
    const storageDomains = [
      'drive.google.com',
      'dropbox.com',
      'onedrive.live.com',
      'microsoft.com',
      'icloud.com',
      'mega.nz',
      'yandex.ru',
      'disk.yandex.ru'
    ];

    try {
      const urlObj = new URL(url);
      return storageDomains.some(domain =>
        urlObj.hostname.includes(domain)
      );
    } catch {
      return false;
    }
  }

  /**
   * Получить все query параметры
   * @returns Observable<{ [key: string]: any }>
   */
  getAllParams(): Observable<{ [key: string]: any }> {
    return this.route.queryParams.pipe(take(1));
  }

  /**
   * Проверить, является ли URL валидным Guitar Pro файлом
   * @param url - URL для проверки
   * @returns boolean
   */
  isValidGuitarProUrl(url: string): boolean {
    return this.validateAndCleanUrl(url) !== null;
  }

  /**
   * Получить список поддерживаемых расширений
   * @returns string[]
   */
  getSupportedExtensions(): string[] {
    return [...this.SUPPORTED_EXTENSIONS];
  }
}
