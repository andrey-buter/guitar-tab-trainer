/**
 * Custom wrapper над AlphaTabApi
 * Расширяет функционал без модификации исходного кода
 */

import * as alphaTab from '@coderline/alphatab';

export class CustomAlphaTabApi extends alphaTab.AlphaTabApi {
  private noteNamesEnabled = false;

  constructor(element: HTMLElement, options: any) {
    // Автоматически включаем includeNoteBounds
    const customOptions = {
      ...options,
      core: {
        ...options?.core,
        includeNoteBounds: true  // Всегда включено
      }
    };

    super(element, customOptions);

    // Подписываемся на события для кастомизации
    this.setupCustomBehavior();
  }

  private setupCustomBehavior(): void {
    // Можем переопределить поведение через события
    this.renderFinished.on(() => {
      if (this.noteNamesEnabled) {
        this.renderNoteNames();
      }
    });
  }

  /**
   * Кастомный метод: включить отображение названий нот
   */
  public enableNoteNames(): void {
    this.noteNamesEnabled = true;
    this.renderNoteNames();
  }

  /**
   * Кастомный метод: отключить отображение названий нот
   */
  public disableNoteNames(): void {
    this.noteNamesEnabled = false;
    // Удалить overlay
  }

  private renderNoteNames(): void {
    // Ваша логика overlay здесь
    const boundsLookup = (this as any).renderer?.boundsLookup;
    if (!boundsLookup) return;

    // ... создание overlay ...
  }

  /**
   * Переопределяем методы если нужно
   */
  public override render(): void {
    console.log('[CustomAlphaTab] Custom render logic');
    super.render();
  }
}

// Использование:
// const api = new CustomAlphaTabApi(element, settings);
// api.enableNoteNames();

