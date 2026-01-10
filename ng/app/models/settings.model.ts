/**
 * Модель настроек приложения
 * Расширяемая архитектура для добавления новых параметров
 */

export interface AppSettings {
  display: DisplaySettings;
  playback: PlaybackSettings;
  notation: NotationSettings;
}

export interface DisplaySettings {
  /** Механизм отображения названий нот */
  noteDisplayMechanism: 'overlay' | 'replace';
  /** Что заменять названиями нот */
  noteNamesTarget: 'none' | 'tab-numbers' | 'tab-numbers-octave' | 'scale-degrees' | 'scale-degrees-roman';
  /** Тема оформления */
  theme: 'light' | 'dark';
  /** Масштаб отображения */
  zoom: number;
}

export interface PlaybackSettings {
  /** Скорость воспроизведения (в процентах) */
  speed: number;
  /** Включен ли метроном */
  metronomeEnabled: boolean;
  /** Включен ли счетчик */
  countInEnabled: boolean;
}

export interface NotationSettings {
  /** Режим отображения нотации */
  notationMode: 'staff-only' | 'tab-only' | 'both';
  /** Система обозначения нот */
  noteNameFormat: 'english' | 'german' | 'solfege';
}

/**
 * Настройки по умолчанию
 */
export const DEFAULT_SETTINGS: AppSettings = {
  display: {
    noteDisplayMechanism: 'replace',
    noteNamesTarget: 'tab-numbers',
    theme: 'light',
    zoom: 1.0
  },
  playback: {
    speed: 100,
    metronomeEnabled: false,
    countInEnabled: false
  },
  notation: {
    notationMode: 'tab-only',
    noteNameFormat: 'english'
  }
};

