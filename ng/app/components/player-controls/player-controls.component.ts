import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AlphaTabService } from '../../services/alphatab.service';

/**
 * Компонент управления воспроизведением
 */
@Component({
  selector: 'app-player-controls',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './player-controls.component.html',
  styleUrl: './player-controls.component.css'
})
export class PlayerControlsComponent {
  isPlaying = false;

  @Input() onOpenSettings?: () => void;

  constructor(private alphaTabService: AlphaTabService) {}

  /**
   * Воспроизведение/Пауза
   */
  playPause(): void {
    this.alphaTabService.playPause();
    this.isPlaying = !this.isPlaying;
  }

  /**
   * Остановить
   */
  stop(): void {
    this.alphaTabService.stop();
    this.isPlaying = false;
  }

  /**
   * Открыть панель настроек
   */
  openSettings(): void {
    if (this.onOpenSettings) {
      this.onOpenSettings();
    }
  }

  /**
   * Загрузить файл
   */
  loadFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.alphaTabService.loadFile(input.files[0]);
    }
  }
}

