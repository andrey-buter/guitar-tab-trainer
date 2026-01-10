import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../../services/settings.service';
import { AppSettings } from '../../models/settings.model';

/**
 * Компонент панели настроек
 * Позволяет пользователю изменять различные параметры приложения
 */
@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './settings-panel.component.html',
  styleUrl: './settings-panel.component.css'
})
export class SettingsPanelComponent implements OnInit {
  settings!: AppSettings;
  isOpen = false;

  constructor(
    private settingsService: SettingsService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.settingsService.getSettings().subscribe(settings => {
      this.settings = settings;
    });
  }

  /**
   * Переключить видимость панели настроек
   */
  togglePanel(): void {
    this.isOpen = !this.isOpen;
  }

  /**
   * Закрыть панель
   */
  close(): void {
    this.isOpen = false;
  }

  /**
   * Обновить настройки отображения
   */
  updateDisplaySettings(): void {
    console.log('Updating display settings:', this.settings.display);
    this.settingsService.updateSettings({
      display: this.settings.display
    });
  }

  /**
   * Обновить настройки воспроизведения
   */
  updatePlaybackSettings(): void {
    this.settingsService.updateSettings({
      playback: this.settings.playback
    });
  }

  /**
   * Обновить настройки нотации
   */
  updateNotationSettings(): void {
    console.log('Updating notation settings:', this.settings.notation);
    this.settingsService.updateSettings({
      notation: this.settings.notation
    });

    // Перезагружаем страницу для применения изменений staveProfile
    // (это ограничение AlphaTab API - staveProfile применяется только при инициализации)
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }

  /**
   * Переключить режим отображения нот (убрано - теперь используются radio buttons)
   */
  // Метод больше не нужен, т.к. используются radio buttons

  /**
   * Сбросить настройки
   */
  resetSettings(): void {
    // Используем английский текст по умолчанию для confirm, так как он не поддерживает переводы напрямую
    const message = this.translate.currentLang === 'ru'
      ? 'Вы уверены, что хотите сбросить все настройки?'
      : 'Are you sure you want to reset all settings?';

    if (confirm(message)) {
      this.settingsService.resetToDefaults();
    }
  }
}

