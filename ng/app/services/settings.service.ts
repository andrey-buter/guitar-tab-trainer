import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppSettings, DEFAULT_SETTINGS } from '../models/settings.model';

/**
 * Сервис управления настройками приложения
 * Использует LocalStorage для сохранения настроек между сессиями
 */
@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'guitarpro_settings';
  private settingsSubject: BehaviorSubject<AppSettings>;

  constructor() {
    const savedSettings = this.loadSettings();
    this.settingsSubject = new BehaviorSubject<AppSettings>(savedSettings);
  }

  /**
   * Получить текущие настройки как Observable
   */
  getSettings(): Observable<AppSettings> {
    return this.settingsSubject.asObservable();
  }

  /**
   * Получить текущие настройки как значение
   */
  getCurrentSettings(): AppSettings {
    return this.settingsSubject.value;
  }

  /**
   * Обновить настройки
   */
  updateSettings(settings: Partial<AppSettings>): void {
    const currentSettings = this.settingsSubject.value;
    const newSettings: AppSettings = {
      display: { ...currentSettings.display, ...settings.display },
      playback: { ...currentSettings.playback, ...settings.playback },
      notation: { ...currentSettings.notation, ...settings.notation }
    };

    this.settingsSubject.next(newSettings);
    this.saveSettings(newSettings);
  }

  /**
   * Переключить цель замены названиями нот
   */
  cycleNoteNamesTarget(): void {
    const current = this.settingsSubject.value;
    const targets: Array<'none' | 'tab-numbers' | 'tab-numbers-octave' | 'scale-degrees' | 'scale-degrees-roman'> =
      ['none', 'tab-numbers', 'tab-numbers-octave', 'scale-degrees', 'scale-degrees-roman'];

    const currentIndex = targets.indexOf(current.display.noteNamesTarget);
    const nextIndex = (currentIndex + 1) % targets.length;

    this.updateSettings({
      display: {
        ...current.display,
        noteNamesTarget: targets[nextIndex]
      }
    });
  }

  /**
   * Сбросить настройки к значениям по умолчанию
   */
  resetToDefaults(): void {
    this.settingsSubject.next(DEFAULT_SETTINGS);
    this.saveSettings(DEFAULT_SETTINGS);
  }

  /**
   * Загрузить настройки из LocalStorage
   */
  private loadSettings(): AppSettings {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge с дефолтными настройками на случай, если добавились новые поля
        return {
          display: { ...DEFAULT_SETTINGS.display, ...parsed.display },
          playback: { ...DEFAULT_SETTINGS.playback, ...parsed.playback },
          notation: { ...DEFAULT_SETTINGS.notation, ...parsed.notation }
        };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return DEFAULT_SETTINGS;
  }

  /**
   * Сохранить настройки в LocalStorage
   */
  private saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }
}

