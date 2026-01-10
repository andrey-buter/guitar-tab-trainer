import { Injectable } from '@angular/core';
import * as alphaTab from '@coderline/alphatab';
import { MUSIC_CONSTANTS } from '../config/alphatab.config';

/**
 * Сервис для создания overlay с названиями нот поверх табулатуры
 */
@Injectable({
  providedIn: 'root'
})
export class NoteOverlayService {
  private overlayContainer: HTMLDivElement | null = null;

  /**
   * Создать overlay с названиями нот
   */
  createNoteOverlay(
    api: alphaTab.AlphaTabApi,
    container: HTMLElement,
    noteFormat: 'english' | 'german' | 'solfege'
  ): void {
    // Удаляем старый overlay если есть
    this.removeOverlay();

    // Создаём контейнер для overlay
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.className = 'note-overlay';
    this.overlayContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;

    const score = api.score;
    if (!score) return;

    // Получаем настройку струн
    let tuning = MUSIC_CONSTANTS.STANDARD_TUNING;
    try {
      if (score.tracks && score.tracks.length > 0) {
        const track = score.tracks[0];
        if (track.staves && track.staves.length > 0) {
          const staff = track.staves[0];
          if (staff.tuning && staff.tuning.length > 0) {
            tuning = staff.tuning.map((t: any) => t);
          }
        }
      }
    } catch (e) {
      console.log('Using standard tuning for overlay');
    }

    // Проходим по всем тактам и нотам
    console.log('Creating note overlay...');
    let noteCount = 0;

    try {
      score.tracks.forEach((track: any) => {
        track.staves.forEach((staff: any) => {
          staff.bars.forEach((bar: any) => {
            bar.voices.forEach((voice: any) => {
              voice.beats.forEach((beat: any) => {
                beat.notes.forEach((note: any) => {
                  const fret = note.fret;
                  const string = note.string - 1; // AlphaTab использует 1-based индекс

                  if (string >= 0 && string < tuning.length) {
                    const noteName = this.calculateNoteName(fret, string, tuning, noteFormat);

                    // Создаём элемент для отображения названия ноты
                    // Позиционирование будет сложным без доступа к координатам рендеринга
                    // Это демонстрационный код
                    noteCount++;
                  }
                });
              });
            });
          });
        });
      });
    } catch (e) {
      console.error('Error creating overlay:', e);
    }

    console.log(`Would display ${noteCount} note names`);

    // Добавляем overlay в контейнер
    container.style.position = 'relative';
    container.appendChild(this.overlayContainer);
  }

  /**
   * Удалить overlay
   */
  removeOverlay(): void {
    if (this.overlayContainer && this.overlayContainer.parentNode) {
      this.overlayContainer.parentNode.removeChild(this.overlayContainer);
      this.overlayContainer = null;
    }
  }

  /**
   * Вычислить название ноты
   */
  private calculateNoteName(
    fret: number,
    stringIndex: number,
    tuning: number[],
    format: 'english' | 'german' | 'solfege'
  ): string {
    const baseMidi = tuning[stringIndex];
    const midiNote = baseMidi + fret;
    const noteIndex = midiNote % 12;
    return MUSIC_CONSTANTS.NOTE_NAMES[format][noteIndex];
  }
}

