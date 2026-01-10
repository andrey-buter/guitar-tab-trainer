import { Injectable } from '@angular/core';
import * as alphaTab from '@coderline/alphatab';
import { NotationHelperService } from './notation-helper.service';
import { SettingsService } from './settings.service';
import { KeyDetectionService } from './key-detection.service';
import { MUSIC_CONSTANTS } from '../config/alphatab.config';

/**
 * Сервис для управления отображением названий нот
 * Создание overlay, информационных панелей, CSS стилей
 */
@Injectable({
  providedIn: 'root'
})
export class NoteNamesService {
  private renderHandler: (() => void) | null = null;
  private partialRenderHandler: (() => void) | null = null;
  private isCreatingOverlay = false;
  private overlayDebounceTimer: any = null;

  // Кэш для оптимизации производительности
  private cachedKeyInfo: { score: alphaTab.model.Score; keyInfo: any } | null = null;
  private lastOverlayHash: string | null = null;

  constructor(
    private notationHelper: NotationHelperService,
    private settingsService: SettingsService,
    private keyDetectionService: KeyDetectionService
  ) {}

  /**
   * Включить отображение названий нот
   */
  enableNoteNames(api: alphaTab.AlphaTabApi): void {
    if (!api) return;

    const settings = this.settingsService.getCurrentSettings();
    const target = settings.display.noteNamesTarget;
    const mechanism = settings.display.noteDisplayMechanism;

    // Добавляем CSS классы
    const htmlContainer = this.getHTMLContainer(api);
    if (htmlContainer && htmlContainer.classList) {
      htmlContainer.classList.add('show-note-names');
      htmlContainer.classList.add(`note-target-${target}`);
      htmlContainer.classList.add(`note-mechanism-${mechanism}`);

      // Добавляем класс для отображения октав
      if (target === 'tab-numbers-octave') {
        htmlContainer.classList.add('show-octave-numbers');
      } else {
        htmlContainer.classList.remove('show-octave-numbers');
      }
    }

    // Создаем overlay для табулатуры
    if (target === 'tab-numbers' || target === 'tab-numbers-octave' || target === 'scale-degrees' || target === 'scale-degrees-roman') {
      const apiAny = api as any;

      // Отписываемся от старых обработчиков, если они есть
      if (this.renderHandler) {
        api.renderFinished.off(this.renderHandler);
      }
      if (this.partialRenderHandler && apiAny.renderer?.partialRenderFinished) {
        apiAny.renderer.partialRenderFinished.off(this.partialRenderHandler);
      }

      // ОПТИМИЗАЦИЯ: Создаем обработчики с улучшенным debounce
      this.renderHandler = () => {
        // Debounce: отменяем предыдущий таймер
        if (this.overlayDebounceTimer) {
          clearTimeout(this.overlayDebounceTimer);
        }
        // Создаем overlay с оптимальной задержкой
        this.overlayDebounceTimer = setTimeout(() => {
          this.createNoteNamesOverlay(api);
        }, 150); // Уменьшено с 300 до 150ms для лучшей отзывчивости
      };

      this.partialRenderHandler = () => {
        // Debounce: отменяем предыдущий таймер
        if (this.overlayDebounceTimer) {
          clearTimeout(this.overlayDebounceTimer);
        }
        // Создаем overlay с оптимальной задержкой
        this.overlayDebounceTimer = setTimeout(() => {
          this.createNoteNamesOverlay(api);
        }, 150); // Уменьшено с 300 до 150ms
      };

      // Подписываемся на оба события
      api.renderFinished.on(this.renderHandler);

      if (apiAny.renderer?.partialRenderFinished) {
        apiAny.renderer.partialRenderFinished.on(this.partialRenderHandler);
      }

      // Вызываем сразу, если рендеринг уже завершен
      setTimeout(() => this.createNoteNamesOverlay(api), 100);
    }
  }

  /**
   * Отключить отображение названий нот
   */
  disableNoteNames(api: alphaTab.AlphaTabApi): void {
    if (!api) return;

    const apiAny = api as any;

    // Отменяем debounce таймер
    if (this.overlayDebounceTimer) {
      clearTimeout(this.overlayDebounceTimer);
      this.overlayDebounceTimer = null;
    }

    // Сбрасываем флаг и кэш
    this.isCreatingOverlay = false;
    this.cachedKeyInfo = null;
    this.lastOverlayHash = null;

    // Отписываемся от событий
    if (this.renderHandler) {
      api.renderFinished.off(this.renderHandler);
      this.renderHandler = null;
    }
    if (this.partialRenderHandler) {
      if (apiAny.renderer?.partialRenderFinished) {
        apiAny.renderer.partialRenderFinished.off(this.partialRenderHandler);
      }
      this.partialRenderHandler = null;
    }

    const htmlContainer = this.getHTMLContainer(api);
    if (htmlContainer && htmlContainer.classList) {
      htmlContainer.classList.remove('show-note-names');
      htmlContainer.classList.remove('note-target-tab-numbers');
      htmlContainer.classList.remove('note-mechanism-overlay');
      htmlContainer.classList.remove('note-mechanism-replace');
      htmlContainer.classList.remove('show-octave-numbers');
    }

    this.removeNoteNamesOverlay();

    const styleElement = document.getElementById('note-names-css-rules');
    if (styleElement) {
      styleElement.remove();
    }
  }

  /**
   * Создать CSS overlay с названиями нот
   */
  createNoteNamesOverlay(api: alphaTab.AlphaTabApi): void {
    // Защита от повторного входа
    if (this.isCreatingOverlay) {
      return;
    }

    if (!api || !api.score) {
      return;
    }

    const settings = this.settingsService.getCurrentSettings();
    const target = settings.display.noteNamesTarget;

    if (target !== 'tab-numbers' && target !== 'tab-numbers-octave' && target !== 'scale-degrees' && target !== 'scale-degrees-roman') {
      this.removeNoteNamesOverlay();
      return;
    }

    try {
      this.isCreatingOverlay = true;

      const htmlContainer = this.getHTMLContainer(api);
      if (!htmlContainer) {
        this.isCreatingOverlay = false;
        return;
      }

      // Удаляем старый overlay
      this.removeNoteNamesOverlay();

      const apiAny = api as any;
      const boundsLookup = apiAny.renderer?.boundsLookup;

      if (!boundsLookup || !boundsLookup.isFinished) {
        // Don't retry here, we're already subscribed to render events
        this.isCreatingOverlay = false;
        return;
      }

      // Вычисляем полную высоту партитуры
      let maxY = 0;
      boundsLookup.staffSystems?.forEach((staffSystem: any) => {
        const staves = staffSystem.staves || staffSystem.bars || [];
        if (staves && staves.length > 0) {
          staves.forEach((stave: any) => {
            stave.bars?.forEach((barBounds: any) => {
              if (barBounds.visualBounds && barBounds.visualBounds.y + barBounds.visualBounds.h > maxY) {
                maxY = barBounds.visualBounds.y + barBounds.visualBounds.h;
              }
            });
          });
        }
      });

      // Создаем overlay контейнер
      const overlayContainer = document.createElement('div');
      overlayContainer.id = 'note-names-overlay-container';
      overlayContainer.style.position = 'absolute';
      overlayContainer.style.top = '0';
      overlayContainer.style.left = '0';
      overlayContainer.style.width = '100%';
      overlayContainer.style.height = maxY > 0 ? `${maxY + 100}px` : '100%'; // +100px для запаса
      overlayContainer.style.pointerEvents = 'none';
      overlayContainer.style.overflow = 'visible'; // Изменено с 'hidden' на 'visible'
      htmlContainer.appendChild(overlayContainer);

      // ОПТИМИЗАЦИЯ: Кэшируем settings и keyInfo ОДИН РАЗ перед циклом
      const settings = this.settingsService.getCurrentSettings();
      const isScaleDegrees = settings.display.noteNamesTarget === 'scale-degrees';
      const isScaleDegreesRoman = settings.display.noteNamesTarget === 'scale-degrees-roman';
      const showOctave = settings.display.noteNamesTarget === 'tab-numbers-octave';

      // Кэшируем keyInfo для режима scale-degrees или scale-degrees-roman (вызываем detectKey только один раз!)
      let keyInfo: any = null;
      if ((isScaleDegrees || isScaleDegreesRoman) && api.score) {
        if (this.cachedKeyInfo && this.cachedKeyInfo.score === api.score) {
          keyInfo = this.cachedKeyInfo.keyInfo;
        } else {
          keyInfo = this.keyDetectionService.detectKey(api.score);
          this.cachedKeyInfo = { score: api.score, keyInfo };
        }
      }

      let overlayCount = 0;

      // ОПТИМИЗАЦИЯ: Используем DocumentFragment для batch DOM операций
      const fragment = document.createDocumentFragment();

      // Проходим по staffSystems
      boundsLookup.staffSystems?.forEach((staffSystem: any) => {
        const staves = staffSystem.staves || staffSystem.bars || [];

        if (staves && staves.length > 0) {
          staves.forEach((stave: any) => {
            stave.bars?.forEach((barBounds: any) => {
              barBounds.beats?.forEach((beatBounds: any) => {
                const beat = beatBounds.beat;
                if (!beat || !beat.notes) return;

                const bb = beatBounds as any;

                beat.notes?.forEach((note: any) => {
                  try {
                    // Получаем координаты через NoteBounds
                    let noteX: number | undefined;
                    let noteY: number | undefined;

                    if (bb.notes && bb.notes.length > 0) {
                      const noteBounds = bb.notes.find((nb: any) => nb.note === note);
                      if (noteBounds && noteBounds.noteHeadBounds) {
                        noteX = noteBounds.noteHeadBounds.x + noteBounds.noteHeadBounds.w / 2;
                        noteY = noteBounds.noteHeadBounds.y + noteBounds.noteHeadBounds.h / 2;
                      }
                    }

                    if (noteX !== undefined && noteY !== undefined) {
                      let displayText: string;

                      if (isScaleDegrees && keyInfo) {
                        // Используем ступени лада (keyInfo уже кэширован)
                        const scaleDegree = this.keyDetectionService.getScaleDegreeForNote(note.realValue, keyInfo);
                        const octave = Math.floor(note.realValue / 12) - 1;
                        displayText = `${scaleDegree}${octave}`;
                      } else if (isScaleDegreesRoman && keyInfo) {
                        // Используем римские цифры для ступеней лада
                        const scaleDegree = this.keyDetectionService.getScaleDegreeForNote(note.realValue, keyInfo);
                        const romanNumeral = this.convertToRomanNumeral(scaleDegree);
                        const octave = Math.floor(note.realValue / 12) - 1;
                        displayText = `${romanNumeral}${octave}`;
                      } else {
                        // Используем названия нот
                        displayText = this.notationHelper.midiToNoteNameWithOctave(note.realValue, showOctave);
                      }

                      const label = document.createElement('span');
                      label.className = 'note-name-label'; // Быстрее чем classList.add
                      label.textContent = displayText;
                      // Используем cssText для одной операции вместо множества
                      label.style.cssText = `position:absolute;left:${noteX}px;top:${noteY}px;transform:translate(-50%,-50%);white-space:nowrap;pointer-events:none;z-index:10`;

                      fragment.appendChild(label);
                      overlayCount++;
                    }
                  } catch (e) {
                    // Игнорируем ошибки для отдельных нот
                  }
                });
            });
            }); // Закрываем stave.bars?.forEach
          }); // Закрываем staves.forEach
        } // Закрываем if (staves && staves.length > 0)
      }); // Закрываем boundsLookup.staffSystems?.forEach

      // ОПТИМИЗАЦИЯ: Добавляем все элементы одной операцией
      overlayContainer.appendChild(fragment);

      this.isCreatingOverlay = false;

    } catch (e) {
      console.error('[NoteNames] Error creating overlay:', e);
      this.isCreatingOverlay = false;
    }
  }

  /**
   * Удалить overlay
   */
  removeNoteNamesOverlay(): void {
    const existing = document.getElementById('note-names-overlay-container');
    if (existing) {
      existing.remove();
    }
  }


  /**
   * Получить HTML контейнер из AlphaTab API
   */
  private getHTMLContainer(api: alphaTab.AlphaTabApi): HTMLElement | null {
    const apiAny = api as any;
    const container = apiAny.container?.element || apiAny.container;

    if (container instanceof HTMLElement) {
      return container;
    } else if (container && typeof container === 'object') {
      return (container as any).element || (container as any)._element;
    }

    return null;
  }

  /**
   * Конвертирует обозначение ступени лада в римскую цифру
   * @param scaleDegree - обозначение ступени (T, S, M, SD, D, SM, L) или неизвестная нота
   * @returns Римская цифра (I, II, III, IV, V, VI, VII) или исходное значение
   */
  private convertToRomanNumeral(scaleDegree: string): string {
    const romanMap: { [key: string]: string } = {
      'T': 'I',     // Tonic
      'S': 'II',    // Supertonic
      'M': 'III',   // Mediant
      'SD': 'IV',   // Subdominant
      'D': 'V',     // Dominant
      'SM': 'VI',   // Submediant
      'L': 'VII'    // Leading tone
    };

    return romanMap[scaleDegree] || scaleDegree;
  }
}

