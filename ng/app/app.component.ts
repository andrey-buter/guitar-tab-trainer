    import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AlphaTabService, TrackInfo } from './services/alphatab.service';
import { SettingsService } from './services/settings.service';
import { KeyDetectionService, KeyInfo, TuningInfo, ScaleDegree } from './services/key-detection.service';
import { UrlParamsService } from './services/url-params.service';
import { PlayerControlsComponent } from './components/player-controls/player-controls.component';
import { SettingsPanelComponent } from './components/settings-panel/settings-panel.component';

/**
 * Главный компонент приложения Guitar Pro Clone
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    FormsModule,
    TranslateModule,
    PlayerControlsComponent,
    SettingsPanelComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('alphaTab') alphaTabElement!: ElementRef<HTMLDivElement>;
  @ViewChild('settingsPanel') settingsPanel!: SettingsPanelComponent;

  title = 'Guitar Pro Clone';

  // Информация о композиции
  keyInfo: KeyInfo | null = null;
  tuningInfo: TuningInfo | null = null;
  songTitle: string = '';

  // Ступени лада
  scaleDegrees: ScaleDegree[] = [];
  scaleNotes: string[] = [];

  // Тогглеры для таблицы ступеней
  showScaleNotes: boolean = false;

  // Дорожки
  tracks: TrackInfo[] = [];
  showTracksPanel: boolean = false;

  // Памятка октав на грифе
  showFretboardOctaves: boolean = false;

  // Состояние загрузки файла по URL
  isLoadingFromUrl: boolean = false;
  loadProgressMessage: string = '';
  loadError: string = '';

  constructor(
    private alphaTabService: AlphaTabService,
    private settingsService: SettingsService,
    private keyDetectionService: KeyDetectionService,
    private urlParamsService: UrlParamsService,
    private translate: TranslateService
  ) {
    // Настройка переводов
    this.translate.addLangs(['en', 'ru']);
    this.translate.setDefaultLang('en');

    // Проверяем сохраненный язык в localStorage
    const savedLang = localStorage.getItem('app-language') || 'en';
    this.translate.use(savedLang);

    // Получаем ступени лада
    this.scaleDegrees = this.keyDetectionService.getScaleDegrees();
  }

  ngAfterViewInit(): void {
    // Инициализируем AlphaTab через сервис
    this.alphaTabService.initialize(
      this.
        alphaTabElement.nativeElement,
      'https://www.alphatab.net/files/canon.gp'
    );

    // Подписываемся на событие загрузки score
    this.alphaTabService.scoreLoaded$.subscribe(() => {
      setTimeout(() => {
        this.updateSongInfo();
      }, 500); // Небольшая задержка для полной инициализации
    });

    // Проверяем наличие URL параметра gtp и загружаем файл если есть
    this.checkAndLoadFromUrl();
  }

  ngOnDestroy(): void {
    this.alphaTabService.destroy();
  }

  /**
   * Обновить информацию о композиции
   */
  updateSongInfo(): void {
    const api = this.alphaTabService.getApi();
    if (!api || !api.score) return;

    console.log('[AppComponent] Updating song info...');

    // Получаем название композиции
    this.songTitle = api.score.title || 'Без названия';

    // Определяем тональность
    this.keyInfo = this.keyDetectionService.detectKey(api.score);

    // Получаем информацию о строе
    this.tuningInfo = this.keyDetectionService.getTuningInfo(api.score);

    // Получаем ноты текущей гаммы
    if (this.keyInfo) {
      this.scaleNotes = this.keyDetectionService.getScaleNotes(this.keyInfo);
    }

    // Получаем список дорожек
    this.tracks = this.alphaTabService.getTracks();

    console.log('[AppComponent] Song info updated:', {
      title: this.songTitle,
      key: this.keyInfo,
      tuning: this.tuningInfo,
      scaleNotes: this.scaleNotes,
      tracks: this.tracks
    });
  }

  /**
   * Получить отформатированный строй
   */
  getFormattedTuning(): string {
    if (!this.tuningInfo) return '';
    return this.keyDetectionService.formatTuning(this.tuningInfo);
  }

  /**
   * Проверить, включен ли режим ступеней лада
   */
  isScaleDegreesMode(): boolean {
    const settings = this.settingsService.getCurrentSettings();
    return settings.display.noteNamesTarget === 'scale-degrees' ||
           settings.display.noteNamesTarget === 'scale-degrees-roman';
  }

  /**
   * Открыть панель настроек
   */
  openSettings(): void {
    this.settingsPanel.togglePanel();
  }

  /**
   * Получить текущий режим отображения названий нот
   */
  getCurrentNoteNamesTarget(): string {
    const settings = this.settingsService.getCurrentSettings();
    return settings.display.noteNamesTarget;
  }

  /**
   * Установить режим отображения названий нот
   */
  setNoteNamesTarget(target: 'none' | 'tab-numbers' | 'tab-numbers-octave' | 'scale-degrees' | 'scale-degrees-roman'): void {
    const currentSettings = this.settingsService.getCurrentSettings();
    this.settingsService.updateSettings({
      display: {
        ...currentSettings.display,
        noteNamesTarget: target
      }
    });
  }

  /**
   * Получить текущий язык
   */
  getCurrentLanguage(): string {
    return this.translate.currentLang || 'en';
  }

  /**
   * Переключить язык
   */
  switchLanguage(lang: 'en' | 'ru'): void {
    this.translate.use(lang);
    localStorage.setItem('app-language', lang);
  }

  /**
   * Переключить панель дорожек
   */
  toggleTracksPanel(): void {
    this.showTracksPanel = !this.showTracksPanel;
  }

  /**
   * Переключить видимость дорожки
   */
  toggleTrackVisibility(trackIndex: number): void {
    this.alphaTabService.toggleTrackVisibility(trackIndex);
    // Обновляем список дорожек
    this.tracks = this.alphaTabService.getTracks();
  }

  /**
   * Переключить mute дорожки
   */
  toggleTrackMute(trackIndex: number): void {
    this.alphaTabService.toggleTrackMute(trackIndex);
    // Обновляем список дорожек
    this.tracks = this.alphaTabService.getTracks();
  }

  /**
   * Переключить solo дорожки
   */
  toggleTrackSolo(trackIndex: number): void {
    this.alphaTabService.toggleTrackSolo(trackIndex);
    // Обновляем список дорожек
    this.tracks = this.alphaTabService.getTracks();
  }

  /**
   * Переключить памятку октав
   */
  toggleFretboardOctaves(): void {
    this.showFretboardOctaves = !this.showFretboardOctaves;
  }

  /**
   * Получить октаву для ноты (MIDI значение)
   */
  getOctaveForMidi(midiValue: number): number {
    return Math.floor(midiValue / 12) - 1;
  }

  /**
   * Генерация данных грифа для стандартного строя E-A-D-G-B-E
   */
  getFretboardData(): { string: number; fret: number; note: string; octave: number }[] {
    const tuning = [64, 59, 55, 50, 45, 40]; // E4, B3, G3, D3, A2, E2 (стандартный строй)
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const fretboard: { string: number; fret: number; note: string; octave: number }[] = [];

    for (let stringIndex = 0; stringIndex < tuning.length; stringIndex++) {
      for (let fret = 0; fret <= 24; fret++) {
        const midiValue = tuning[stringIndex] + fret;
        const octave = Math.floor(midiValue / 12) - 1;
        const noteName = noteNames[midiValue % 12];
        fretboard.push({
          string: stringIndex + 1,
          fret: fret,
          note: noteName,
          octave: octave
        });
      }
    }

    return fretboard;
  }

  /**
   * Получить цвет для октавы
   */
  getOctaveColor(octave: number): string {
    const colors: { [key: number]: string } = {
      2: '#e53e3e', // Красный
      3: '#dd6b20', // Оранжевый
      4: '#d69e2e', // Желтый
      5: '#38a169', // Зеленый
      6: '#3182ce', // Синий
      7: '#805ad5'  // Фиолетовый
    };
    return colors[octave] || '#718096'; // Серый по умолчанию
  }

  /**
   * Проверить наличие URL параметра gtp и загрузить файл если есть
   */
  private checkAndLoadFromUrl(): void {
    this.urlParamsService.getGuitarProUrl().subscribe(url => {
      if (url) {
        console.log('[AppComponent] Found gtp URL parameter:', url);
        this.loadFileFromUrl(url);
      } else {
        console.log('[AppComponent] No gtp URL parameter found');
      }
    });
  }

  /**
   * Загрузить файл из URL
   * @param url - URL файла для загрузки
   */
  private loadFileFromUrl(url: string): void {
    this.isLoadingFromUrl = true;
    this.loadError = '';
    this.loadProgressMessage = 'Processing URL...';

    console.log('[AppComponent] Loading file from URL:', url);

    // Валидируем URL
    if (!this.alphaTabService.validateGuitarProUrl(url)) {
      this.handleLoadError('Invalid Guitar Pro file URL');
      return;
    }

    // Загружаем файл с fallback на дефолтный
    const fallbackUrl = 'https://www.alphatab.net/files/canon.gp';

    this.alphaTabService.loadFromUrlWithFallback(url, fallbackUrl).subscribe({
      next: (success) => {
        if (success) {
          console.log('[AppComponent] File loaded successfully from URL');
          this.isLoadingFromUrl = false;
          this.loadProgressMessage = '';

          // Обновляем информацию о композиции после загрузки
          setTimeout(() => {
            this.updateSongInfo();
          }, 1000);
        }
      },
      error: (error) => {
        console.error('[AppComponent] Failed to load file from URL:', error);
        this.handleLoadError(error.message || 'Failed to load file from URL');
      }
    });
  }

  /**
   * Обработать ошибку загрузки
   * @param errorMessage - Сообщение об ошибке
   */
  private handleLoadError(errorMessage: string): void {
    this.isLoadingFromUrl = false;
    this.loadError = errorMessage;
    this.loadProgressMessage = '';

    console.error('[AppComponent] Load error:', errorMessage);
  }

  /**
   * Повторить загрузку файла по URL
   */
  retryLoadFromUrl(): void {
    this.urlParamsService.getGuitarProUrl().subscribe(url => {
      if (url) {
        this.loadFileFromUrl(url);
      }
    });
  }

  /**
   * Очистить ошибку загрузки
   */
  clearLoadError(): void {
    this.loadError = '';
  }

  /**
   * Проверить, есть ли активная загрузка
   */
  hasActiveLoad(): boolean {
    return this.isLoadingFromUrl;
  }

  /**
   * Проверить, есть ли ошибка загрузки
   */
  hasLoadError(): boolean {
    return this.loadError.length > 0;
  }

  /**
   * Получить сообщение о состоянии загрузки
   */
  getLoadStatusMessage(): string {
    if (this.isLoadingFromUrl) {
      return this.loadProgressMessage || 'Loading...';
    } else if (this.loadError) {
      return `Error: ${this.loadError}`;
    }
    return '';
  }
}
