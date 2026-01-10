import { Injectable } from '@angular/core';
import * as alphaTab from '@coderline/alphatab';

/**
 * Профили гамм для алгоритма Krumhansl-Schmuckler
 * Значения представляют "вес" каждой ступени в тональности
 */
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/**
 * Названия нот
 */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Названия тональностей на русском
 */
const KEY_NAMES_RU: { [key: string]: string } = {
  'C major': 'До мажор',
  'C# major': 'До-диез мажор',
  'D major': 'Ре мажор',
  'D# major': 'Ре-диез мажор',
  'E major': 'Ми мажор',
  'F major': 'Фа мажор',
  'F# major': 'Фа-диез мажор',
  'G major': 'Соль мажор',
  'G# major': 'Соль-диез мажор',
  'A major': 'Ля мажор',
  'A# major': 'Ля-диез мажор',
  'B major': 'Си мажор',
  'C minor': 'До минор',
  'C# minor': 'До-диез минор',
  'D minor': 'Ре минор',
  'D# minor': 'Ре-диез минор',
  'E minor': 'Ми минор',
  'F minor': 'Фа минор',
  'F# minor': 'Фа-диез минор',
  'G minor': 'Соль минор',
  'G# minor': 'Соль-диез минор',
  'A minor': 'Ля минор',
  'A# minor': 'Ля-диез минор',
  'B minor': 'Си минор',
  'Db major': 'Ре-бемоль мажор',
  'Eb major': 'Ми-бемоль мажор',
  'Gb major': 'Соль-бемоль мажор',
  'Ab major': 'Ля-бемоль мажор',
  'Bb major': 'Си-бемоль мажор',
  'Db minor': 'Ре-бемоль минор',
  'Eb minor': 'Ми-бемоль минор',
  'Gb minor': 'Соль-бемоль минор',
  'Ab minor': 'Ля-бемоль минор',
  'Bb minor': 'Си-бемоль минор'
};

export interface KeyInfo {
  key: string;           // Тоника (например, 'C', 'A', 'F#')
  mode: 'major' | 'minor'; // Лад
  keyName: string;       // Полное название (например, 'C major', 'A minor')
  keyNameRu: string;     // Название на русском
  confidence: number;    // Уверенность определения (0-1)
}

export interface TuningInfo {
  tuningName: string;    // Название строя
  notes: string[];       // Ноты каждой струны
  midiValues: number[];  // MIDI значения
}

export interface ScaleDegree {
  degree: number;        // Номер ступени (1-7)
  short: string;         // Краткое обозначение (T, S, M, SD, D, SM, L)
  englishFull: string;   // Полное английское название
  russianFull: string;   // Полное русское название
  interval: string;      // Интервал до следующей ступени (T = тон, S = полутон)
  intervalEnglish: string; // Английское название интервала (Tone/Semitone)
}

/**
 * Сервис для определения тональности композиции
 * Использует алгоритм Krumhansl-Schmuckler
 */
@Injectable({
  providedIn: 'root'
})
export class KeyDetectionService {

  /**
   * Определить тональность по score
   */
  detectKey(score: alphaTab.model.Score): KeyInfo {
    console.log('[KeyDetection] Analyzing score for key detection...');

    // Собираем все ноты из всех треков
    const noteCounts = new Array(12).fill(0);
    let totalNotes = 0;

    score.tracks.forEach(track => {
      track.staves.forEach(staff => {
        staff.bars.forEach(bar => {
          bar.voices.forEach(voice => {
            voice.beats.forEach(beat => {
              beat.notes.forEach(note => {
                const pitchClass = note.realValue % 12;
                noteCounts[pitchClass]++;
                totalNotes++;
              });
            });
          });
        });
      });
    });

    console.log('[KeyDetection] Total notes analyzed:', totalNotes);
    console.log('[KeyDetection] Note distribution:', noteCounts);

    if (totalNotes === 0) {
      return {
        key: 'C',
        mode: 'major',
        keyName: 'C major',
        keyNameRu: 'До мажор',
        confidence: 0
      };
    }

    // Нормализуем счетчики
    const noteProfile = noteCounts.map(count => count / totalNotes);

    // Вычисляем корреляцию с каждой возможной тональностью
    let bestKey = 'C';
    let bestMode: 'major' | 'minor' = 'major';
    let bestCorrelation = -Infinity;

    for (let tonic = 0; tonic < 12; tonic++) {
      // Проверяем мажор
      const majorCorr = this.calculateCorrelation(noteProfile, MAJOR_PROFILE, tonic);
      if (majorCorr > bestCorrelation) {
        bestCorrelation = majorCorr;
        bestKey = NOTE_NAMES[tonic];
        bestMode = 'major';
      }

      // Проверяем минор
      const minorCorr = this.calculateCorrelation(noteProfile, MINOR_PROFILE, tonic);
      if (minorCorr > bestCorrelation) {
        bestCorrelation = minorCorr;
        bestKey = NOTE_NAMES[tonic];
        bestMode = 'minor';
      }
    }

    // Нормализуем уверенность (correlation обычно в диапазоне -1 до 1)
    const confidence = Math.max(0, Math.min(1, (bestCorrelation + 1) / 2));

    const keyName = `${bestKey} ${bestMode}`;
    const keyNameRu = KEY_NAMES_RU[keyName] || keyName;

    console.log('[KeyDetection] Detected key:', keyName, 'confidence:', confidence.toFixed(2));

    return {
      key: bestKey,
      mode: bestMode,
      keyName,
      keyNameRu,
      confidence
    };
  }

  /**
   * Вычислить корреляцию между профилем нот и профилем гаммы
   */
  private calculateCorrelation(noteProfile: number[], scaleProfile: number[], tonic: number): number {
    // Транспонируем профиль гаммы под тонику
    const rotatedProfile = [];
    for (let i = 0; i < 12; i++) {
      rotatedProfile[i] = scaleProfile[(i - tonic + 12) % 12];
    }

    // Вычисляем корреляцию Пирсона
    const meanNote = noteProfile.reduce((sum, val) => sum + val, 0) / 12;
    const meanScale = rotatedProfile.reduce((sum, val) => sum + val, 0) / 12;

    let numerator = 0;
    let denomNote = 0;
    let denomScale = 0;

    for (let i = 0; i < 12; i++) {
      const noteDeviation = noteProfile[i] - meanNote;
      const scaleDeviation = rotatedProfile[i] - meanScale;

      numerator += noteDeviation * scaleDeviation;
      denomNote += noteDeviation * noteDeviation;
      denomScale += scaleDeviation * scaleDeviation;
    }

    if (denomNote === 0 || denomScale === 0) {
      return 0;
    }

    return numerator / Math.sqrt(denomNote * denomScale);
  }

  /**
   * Получить информацию о строе инструмента
   */
  getTuningInfo(score: alphaTab.model.Score): TuningInfo {
    // Пытаемся получить строй из первого трека
    let tuningMidi: number[] = [64, 59, 55, 50, 45, 40]; // Стандартный строй гитары (E A D G B E)

    try {
      if (score && score.tracks && score.tracks.length > 0) {
        const track = score.tracks[0];
        if (track.staves && track.staves.length > 0) {
          const staff = track.staves[0];
          if (staff.tuning && staff.tuning.length > 0) {
            tuningMidi = staff.tuning.map((t: any) => t);
          }
        }
      }
    } catch (e) {
      console.warn('[KeyDetection] Could not read tuning from score, using standard');
    }

    // Преобразуем MIDI в названия нот
    const notes = tuningMidi.map(midi => {
      const pitchClass = midi % 12;
      return NOTE_NAMES[pitchClass];
    });

    // Определяем название строя
    const tuningName = this.identifyTuning(tuningMidi);

    return {
      tuningName,
      notes,
      midiValues: tuningMidi
    };
  }

  /**
   * Определить название строя по MIDI значениям
   */
  private identifyTuning(tuningMidi: number[]): string {
    // Стандартные строи (от толстой струны к тонкой)
    const knownTunings: { [key: string]: number[] } = {
      'Standard (E)': [64, 59, 55, 50, 45, 40],
      'Drop D': [64, 59, 55, 50, 45, 38],
      'Drop C': [62, 57, 53, 48, 43, 36],
      'Drop B': [61, 56, 52, 47, 42, 35],
      'Open D': [62, 59, 54, 50, 45, 38],
      'Open G': [62, 59, 55, 50, 43, 38],
      'DADGAD': [62, 57, 55, 50, 45, 38],
      'Half Step Down': [63, 58, 54, 49, 44, 39],
      'Whole Step Down': [62, 57, 53, 48, 43, 38],
    };

    // Сравниваем с известными строями
    for (const [name, values] of Object.entries(knownTunings)) {
      if (tuningMidi.length === values.length) {
        const matches = tuningMidi.every((midi, i) => midi === values[values.length - 1 - i]);
        if (matches) {
          return name;
        }
      }
    }

    // Если не нашли, возвращаем "Custom"
    return 'Custom';
  }

  /**
   * Получить красивое отображение строя
   */
  formatTuning(tuningInfo: TuningInfo): string {
    // Реверсируем для отображения от тонкой к толстой
    const reversed = [...tuningInfo.notes].reverse();
    return reversed.join(' - ');
  }

  /**
   * Получить все ступени лада
   * Формула мажорной гаммы: Тон-Тон-Полутон-Тон-Тон-Тон-Полутон
   */
  getScaleDegrees(): ScaleDegree[] {
    return [
      { degree: 1, short: 'T', englishFull: 'Tonic', russianFull: 'Тоника', interval: 'T', intervalEnglish: 'Tone' },
      { degree: 2, short: 'S', englishFull: 'Supertonic', russianFull: 'Супертоника', interval: 'T', intervalEnglish: 'Tone' },
      { degree: 3, short: 'M', englishFull: 'Mediant', russianFull: 'Медианта', interval: 'S', intervalEnglish: 'Semitone' },
      { degree: 4, short: 'SD', englishFull: 'Subdominant', russianFull: 'Субдоминанта', interval: 'T', intervalEnglish: 'Tone' },
      { degree: 5, short: 'D', englishFull: 'Dominant', russianFull: 'Доминанта', interval: 'T', intervalEnglish: 'Tone' },
      { degree: 6, short: 'SM', englishFull: 'Submediant', russianFull: 'Субмедианта', interval: 'T', intervalEnglish: 'Tone' },
      { degree: 7, short: 'L', englishFull: 'Leading tone', russianFull: 'Вводный тон', interval: 'S', intervalEnglish: 'Semitone' }
    ];
  }

  /**
   * Получить ноты текущей гаммы на основе тоники
   * @param keyInfo Информация о тональности
   * @returns Массив названий нот гаммы
   */
  getScaleNotes(keyInfo: KeyInfo): string[] {
    const tonicIndex = this.getNoteIndex(keyInfo.key);
    const scale = keyInfo.mode === 'major'
      ? [0, 2, 4, 5, 7, 9, 11]  // Мажорная гамма
      : [0, 2, 3, 5, 7, 8, 10]; // Минорная гамма

    // Определяем, использовать диезы или бемоли
    const useFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(keyInfo.key);
    const noteNames = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES;

    return scale.map(interval => {
      const noteIndex = (tonicIndex + interval) % 12;
      return noteNames[noteIndex];
    });
  }

  /**
   * Определить ступень лада для конкретной ноты
   * @param midiNote MIDI номер ноты
   * @param keyInfo Информация о тональности
   * @returns Краткое обозначение ступени (T, S, M, SD, D, SM, L)
   */
  getScaleDegreeForNote(midiNote: number, keyInfo: KeyInfo): string {
    // Получаем тонику в виде MIDI pitch class (0-11)
    const tonicPitchClass = this.getNoteIndex(keyInfo.key);

    // Определяем гамму (мажор или минор)
    const scale = keyInfo.mode === 'major'
      ? [0, 2, 4, 5, 7, 9, 11]  // Мажорная гамма
      : [0, 2, 3, 5, 7, 8, 10]; // Натуральная минорная гамма

    // Приводим ноту к pitch class (0-11)
    const notePitchClass = midiNote % 12;

    // Вычисляем интервал от тоники
    let interval = (notePitchClass - tonicPitchClass + 12) % 12;

    // Находим ступень в гамме
    const degreeIndex = scale.indexOf(interval);

    if (degreeIndex === -1) {
      // Нота не входит в основную гамму (альтерация)
      // Находим ближайшую ступень
      for (let i = 0; i < scale.length; i++) {
        if (Math.abs(scale[i] - interval) <= 1) {
          const degrees = this.getScaleDegrees();
          return degrees[i].short; // Возвращаем обозначение без диеза
        }
      }
      return '?'; // Неопределенная ступень
    }

    const degrees = this.getScaleDegrees();
    return degrees[degreeIndex].short;
  }

  /**
   * Получить индекс ноты (0-11) по её названию
   */
  private getNoteIndex(noteName: string): number {
    const noteMap: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'Db': 1,
      'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4,
      'F': 5, 'F#': 6, 'Gb': 6,
      'G': 7, 'G#': 8, 'Ab': 8,
      'A': 9, 'A#': 10, 'Bb': 10,
      'B': 11
    };
    return noteMap[noteName] || 0;
  }
}

