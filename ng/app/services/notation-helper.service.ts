import { Injectable } from '@angular/core';
import { MUSIC_CONSTANTS } from '../config/alphatab.config';

/**
 * Сервис для вспомогательных функций работы с нотами
 * Конвертация MIDI, вычисления, и т.д.
 */
@Injectable({
  providedIn: 'root'
})
export class NotationHelperService {

  /**
   * Конвертирует MIDI pitch в название ноты
   * @param midiPitch MIDI номер ноты (0-127)
   * @returns Название ноты (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
   */
  midiToNoteName(midiPitch: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteIndex = midiPitch % 12;
    return noteNames[noteIndex];
  }

  /**
   * Получить номер октавы из MIDI pitch
   * @param midiPitch MIDI номер ноты (0-127)
   * @returns Номер октавы (например, для C4 (middle C) = 4)
   */
  midiToOctave(midiPitch: number): number {
    // В MIDI: C-1 = 0, C0 = 12, C1 = 24, ..., C4 (middle C) = 60, ..., G9 = 127
    return Math.floor(midiPitch / 12) - 1;
  }

  /**
   * Конвертирует MIDI pitch в название ноты с октавой
   * @param midiPitch MIDI номер ноты (0-127)
   * @param includeOctave Включать ли номер октавы
   * @returns Название ноты с октавой (например, "C4", "G#3")
   */
  midiToNoteNameWithOctave(midiPitch: number, includeOctave: boolean = true): string {
    const noteName = this.midiToNoteName(midiPitch);
    if (!includeOctave) {
      return noteName;
    }
    const octave = this.midiToOctave(midiPitch);
    return `${noteName}${octave}`;
  }

  /**
   * Вычислить название ноты по ладу, струне и настройке
   */
  calculateNoteName(fret: number, stringNumber: number, tuning: number[], noteNameFormat: string = 'english'): string {
    const baseMidi = tuning[stringNumber];
    const midiNote = baseMidi + fret;
    const noteIndex = midiNote % 12;
    const format = noteNameFormat as keyof typeof MUSIC_CONSTANTS.NOTE_NAMES;
    return MUSIC_CONSTANTS.NOTE_NAMES[format][noteIndex];
  }

  /**
   * Преобразовать номер лада в название ноты с учетом score
   */
  fretToNoteName(fret: number, stringNumber: number, score: any, noteNameFormat: string = 'english'): string {
    // Используем константы из конфигурации
    let tuning = MUSIC_CONSTANTS.STANDARD_TUNING;

    // Пытаемся получить настройку из первого трека
    try {
      if (score && score.tracks && score.tracks.length > 0) {
        const track = score.tracks[0];
        if (track.staves && track.staves.length > 0) {
          const staff = track.staves[0];
          if (staff.tuning && staff.tuning.length > 0) {
            tuning = staff.tuning.map((t: any) => t);
          }
        }
      }
    } catch (e) {
      // Используем стандартную настройку
    }

    // Вычисляем MIDI ноту
    const baseMidi = tuning[stringNumber] || MUSIC_CONSTANTS.STANDARD_TUNING[stringNumber];
    const midiNote = baseMidi + fret;
    const noteIndex = midiNote % 12;

    const format = noteNameFormat as keyof typeof MUSIC_CONSTANTS.NOTE_NAMES;
    return MUSIC_CONSTANTS.NOTE_NAMES[format][noteIndex];
  }

  /**
   * Получить настройку струн из score
   */
  getTuningFromScore(score: any): number[] {
    let tuning = MUSIC_CONSTANTS.STANDARD_TUNING;

    try {
      if (score && score.tracks && score.tracks.length > 0) {
        const track = score.tracks[0];
        if (track.staves && track.staves.length > 0) {
          const staff = track.staves[0];
          if (staff.tuning && staff.tuning.length > 0) {
            tuning = staff.tuning.map((t: any) => t);
          }
        }
      }
    } catch (e) {
      console.log('Using standard tuning');
    }

    return tuning;
  }

  /**
   * Угадать номер струны по Y-координате
   */
  guessStringFromPosition(y: number, svg: SVGElement, stringCount: number): number | null {
    // Находим все path элементы, которые могут быть линиями струн
    const paths = svg.querySelectorAll('path[d]');
    const stringPositions: number[] = [];

    paths.forEach(path => {
      const d = path.getAttribute('d');
      if (!d) return;

      // Парсим команды пути для поиска горизонтальных линий
      const matches = d.match(/M\s*([\d.]+)\s+([\d.]+)/g);
      if (matches) {
        matches.forEach(match => {
          const coords = match.replace('M', '').trim().split(/\s+/);
          const yCoord = parseFloat(coords[1]);
          if (yCoord > 0 && !stringPositions.some(p => Math.abs(p - yCoord) < 2)) {
            stringPositions.push(yCoord);
          }
        });
      }
    });

    // Также ищем line элементы
    const lines = svg.querySelectorAll('line');
    lines.forEach(line => {
      const y1 = parseFloat(line.getAttribute('y1') || '0');
      const y2 = parseFloat(line.getAttribute('y2') || '0');
      const lineY = (y1 + y2) / 2;
      if (lineY > 0 && !stringPositions.some(p => Math.abs(p - lineY) < 2)) {
        stringPositions.push(lineY);
      }
    });

    // Сортируем позиции
    stringPositions.sort((a, b) => a - b);

    // Берём только уникальные позиции струн
    const uniquePositions = stringPositions.filter((pos, index) => {
      if (index === 0) return true;
      return Math.abs(pos - stringPositions[index - 1]) > 5;
    });

    // Ограничиваем количеством струн
    const finalPositions = uniquePositions.slice(0, stringCount);

    // Находим ближайшую струну
    let closestString = 0;
    let minDistance = Infinity;

    finalPositions.forEach((pos, index) => {
      const distance = Math.abs(y - pos);
      if (distance < minDistance && distance < 15) {
        minDistance = distance;
        closestString = index;
      }
    });

    return minDistance < Infinity ? closestString : null;
  }
}

