import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';
import { DEFAULT_SETTINGS } from '../models/settings.model';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return default settings initially', (done) => {
    service.getSettings().subscribe(settings => {
      expect(settings).toEqual(DEFAULT_SETTINGS);
      done();
    });
  });

  it('should update settings', (done) => {
    service.updateSettings({
      display: {
        ...DEFAULT_SETTINGS.display,
        showNoteNames: true
      }
    });

    service.getSettings().subscribe(settings => {
      expect(settings.display.showNoteNames).toBe(true);
      done();
    });
  });

  it('should toggle note names', (done) => {
    const initialValue = service.getCurrentSettings().display.showNoteNames;

    service.toggleNoteNames();

    service.getSettings().subscribe(settings => {
      expect(settings.display.showNoteNames).toBe(!initialValue);
      done();
    });
  });

  it('should save settings to localStorage', () => {
    service.updateSettings({
      display: {
        ...DEFAULT_SETTINGS.display,
        zoom: 1.5
      }
    });

    const saved = localStorage.getItem('guitarpro_settings');
    expect(saved).toBeTruthy();

    if (saved) {
      const parsed = JSON.parse(saved);
      expect(parsed.display.zoom).toBe(1.5);
    }
  });

  it('should load settings from localStorage', () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      display: {
        ...DEFAULT_SETTINGS.display,
        showNoteNames: true,
        zoom: 2.0
      }
    };

    localStorage.setItem('guitarpro_settings', JSON.stringify(customSettings));

    // Создаём новый экземпляр сервиса для проверки загрузки
    const newService = new SettingsService();
    const loaded = newService.getCurrentSettings();

    expect(loaded.display.showNoteNames).toBe(true);
    expect(loaded.display.zoom).toBe(2.0);
  });

  it('should reset to default settings', (done) => {
    // Изменяем настройки
    service.updateSettings({
      display: {
        ...DEFAULT_SETTINGS.display,
        showNoteNames: true,
        zoom: 1.5
      }
    });

    // Сбрасываем
    service.resetToDefaults();

    service.getSettings().subscribe(settings => {
      expect(settings).toEqual(DEFAULT_SETTINGS);
      done();
    });
  });

  it('should merge with default settings when loading incomplete saved settings', () => {
    const incompleteSettings = {
      display: {
        showNoteNames: true
        // Остальные поля отсутствуют
      }
    };

    localStorage.setItem('guitarpro_settings', JSON.stringify(incompleteSettings));

    const newService = new SettingsService();
    const loaded = newService.getCurrentSettings();

    // Проверяем, что загруженное значение присутствует
    expect(loaded.display.showNoteNames).toBe(true);

    // Проверяем, что отсутствующие значения взяты из дефолтных
    expect(loaded.display.theme).toBe(DEFAULT_SETTINGS.display.theme);
    expect(loaded.display.zoom).toBe(DEFAULT_SETTINGS.display.zoom);
  });

  it('should handle corrupted localStorage data', () => {
    localStorage.setItem('guitarpro_settings', 'invalid json {{{');

    const newService = new SettingsService();
    const loaded = newService.getCurrentSettings();

    expect(loaded).toEqual(DEFAULT_SETTINGS);
  });

  it('should update only specified settings fields', (done) => {
    service.updateSettings({
      display: {
        ...DEFAULT_SETTINGS.display,
        zoom: 1.5
      }
    });

    service.getSettings().subscribe(settings => {
      // Zoom изменился
      expect(settings.display.zoom).toBe(1.5);

      // Остальные поля остались без изменений
      expect(settings.display.showNoteNames).toBe(DEFAULT_SETTINGS.display.showNoteNames);
      expect(settings.display.theme).toBe(DEFAULT_SETTINGS.display.theme);
      expect(settings.playback).toEqual(DEFAULT_SETTINGS.playback);
      expect(settings.notation).toEqual(DEFAULT_SETTINGS.notation);

      done();
    });
  });
});

