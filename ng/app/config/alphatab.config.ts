import * as alphaTab from '@coderline/alphatab';

/**
 * Конфигурация AlphaTab по умолчанию
 * Этот файл позволяет централизованно управлять настройками AlphaTab
 */

export const DEFAULT_ALPHATAB_CONFIG = {
  core: {
    fontDirectory: '/font/',
    useWorkers: true,
    includeNoteBounds: true,  // ✅ Включаем bounds для нот!
  },
  display: {
    scale: 1.0,
    stretchForce: 0.8,
  },
  player: {
    enablePlayer: true,
    soundFont: '/soundfont/sonivox.sf2',
  }
} as const;

/**
 * Предустановки для различных сценариев использования
 */

export const ALPHATAB_PRESETS = {
  minimal: { ...DEFAULT_ALPHATAB_CONFIG, display: { scale: 1.0, stretchForce: 0.8 } },
  print: { ...DEFAULT_ALPHATAB_CONFIG, display: { scale: 1.0, stretchForce: 0.8 } },
  performance: { ...DEFAULT_ALPHATAB_CONFIG, display: { scale: 0.8, stretchForce: 0.8 } },
  beginner: { ...DEFAULT_ALPHATAB_CONFIG, display: { scale: 1.2, stretchForce: 0.8 } }
} as const;

/**
 * Настройки стилей для AlphaTab
 */
export const ALPHATAB_STYLE_CONFIG = {
  colors: {
    // Цвета для курсора воспроизведения
    cursorBar: 'rgba(255, 242, 0, 0.25)',
    cursorBeat: 'rgba(102, 126, 234, 0.75)',

    // Цвета для выделения
    selection: 'rgba(102, 126, 234, 0.2)',

    // Цвета для активных нот
    highlight: '#667eea',

    // Цвета табулатуры
    tabNumberDefault: '#000000',
    tabNumberHighlight: '#667eea',

    // Цвета нот
    noteNameDefault: '#000000',
    noteNameHighlight: '#667eea'
  },

  fonts: {
    // Шрифты для различных элементов
    tabNumber: {
      family: 'Arial, sans-serif',
      size: '11px',
      weight: 'normal'
    },
    noteName: {
      family: 'Arial, sans-serif',
      size: '10px',
      weight: '600'
    },
    chordDiagram: {
      family: 'Arial, sans-serif',
      size: '10px',
      weight: 'normal'
    }
  }
};

/**
 * Константы для настройки музыкальных параметров
 */
export const MUSIC_CONSTANTS = {
  // Стандартная настройка гитары (MIDI ноты)
  STANDARD_TUNING: [64, 59, 55, 50, 45, 40], // E4, B3, G3, D3, A2, E2

  // Альтернативные настройки
  DROP_D_TUNING: [64, 59, 55, 50, 45, 38],   // Drop D
  HALF_STEP_DOWN: [63, 58, 54, 49, 44, 39],  // Half step down
  WHOLE_STEP_DOWN: [62, 57, 53, 48, 43, 38], // Whole step down

  // Ноты в различных системах
  NOTE_NAMES: {
    english: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    german: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B', 'H'],
    solfege: ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'],
    // Энгармонические эквиваленты для бемолей
    englishFlat: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
    germanFlat: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'B', 'H'],
    solfegeFlat: ['Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si']
  },

  // Ограничения
  MIN_FRET: 0,
  MAX_FRET: 24,
  MIN_STRING: 0,
  MAX_STRING: 5,

  // Диапазоны скорости воспроизведения
  MIN_SPEED: 0.25,  // 25%
  MAX_SPEED: 2.0,   // 200%
  DEFAULT_SPEED: 1.0,

  // Диапазоны масштаба
  MIN_ZOOM: 0.5,    // 50%
  MAX_ZOOM: 2.0,    // 200%
  DEFAULT_ZOOM: 1.0
};

/**
 * Вспомогательные функции для работы с конфигурацией
 */
export class AlphaTabConfigHelper {
  /**
   * Получить конфигурацию по имени пресета
   */
  static getPreset(presetName: keyof typeof ALPHATAB_PRESETS): any {
    return ALPHATAB_PRESETS[presetName] || DEFAULT_ALPHATAB_CONFIG;
  }

  /**
   * Объединить конфигурации
   */
  static mergeConfigs(
    base: any,
    override: any
  ): any {
    return {
      ...base,
      ...override,
      core: { ...base.core, ...override.core },
      display: { ...base.display, ...override.display },
      player: { ...base.player, ...override.player }
    };
  }

  /**
   * Создать конфигурацию на основе пользовательских настроек
   */
  static createConfigFromSettings(
    baseConfig: any,
    userSettings: {
      zoom?: number;
      speed?: number;
      showStandardNotation?: boolean;
      showTablature?: boolean;
    }
  ): any {
    const config = { ...baseConfig };

    if (userSettings.zoom !== undefined) {
      config.display = {
        ...config.display,
        scale: userSettings.zoom
      };
    }

    return config;
  }

  /**
   * Проверить валидность значения масштаба
   */
  static validateZoom(zoom: number): number {
    return Math.max(
      MUSIC_CONSTANTS.MIN_ZOOM,
      Math.min(MUSIC_CONSTANTS.MAX_ZOOM, zoom)
    );
  }

  /**
   * Проверить валидность значения скорости
   */
  static validateSpeed(speed: number): number {
    return Math.max(
      MUSIC_CONSTANTS.MIN_SPEED,
      Math.min(MUSIC_CONSTANTS.MAX_SPEED, speed)
    );
  }
}

