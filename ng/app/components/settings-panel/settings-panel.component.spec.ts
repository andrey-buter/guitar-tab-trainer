import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsPanelComponent } from './settings-panel.component';
import { SettingsService } from '../../services/settings.service';
import { of } from 'rxjs';
import { DEFAULT_SETTINGS } from '../../models/settings.model';

describe('SettingsPanelComponent', () => {
  let component: SettingsPanelComponent;
  let fixture: ComponentFixture<SettingsPanelComponent>;
  let settingsService: jasmine.SpyObj<SettingsService>;

  beforeEach(async () => {
    const settingsServiceSpy = jasmine.createSpyObj('SettingsService', [
      'getSettings',
      'updateSettings',
      'toggleNoteNames',
      'resetToDefaults'
    ]);
    settingsServiceSpy.getSettings.and.returnValue(of(DEFAULT_SETTINGS));

    await TestBed.configureTestingModule({
      imports: [SettingsPanelComponent],
      providers: [
        { provide: SettingsService, useValue: settingsServiceSpy }
      ]
    }).compileComponents();

    settingsService = TestBed.inject(SettingsService) as jasmine.SpyObj<SettingsService>;
    fixture = TestBed.createComponent(SettingsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load settings on init', () => {
    expect(component.settings).toEqual(DEFAULT_SETTINGS);
    expect(settingsService.getSettings).toHaveBeenCalled();
  });

  it('should toggle panel visibility', () => {
    expect(component.isOpen).toBe(false);

    component.togglePanel();
    expect(component.isOpen).toBe(true);

    component.togglePanel();
    expect(component.isOpen).toBe(false);
  });

  it('should close panel', () => {
    component.isOpen = true;
    component.close();
    expect(component.isOpen).toBe(false);
  });

  it('should update display settings', () => {
    component.settings = { ...DEFAULT_SETTINGS };
    component.settings.display.showNoteNames = true;

    component.updateDisplaySettings();

    expect(settingsService.updateSettings).toHaveBeenCalledWith({
      display: component.settings.display
    });
  });

  it('should update playback settings', () => {
    component.settings = { ...DEFAULT_SETTINGS };
    component.settings.playback.speed = 150;

    component.updatePlaybackSettings();

    expect(settingsService.updateSettings).toHaveBeenCalledWith({
      playback: component.settings.playback
    });
  });

  it('should update notation settings', () => {
    component.settings = { ...DEFAULT_SETTINGS };
    component.settings.notation.noteNameFormat = 'german';

    component.updateNotationSettings();

    expect(settingsService.updateSettings).toHaveBeenCalledWith({
      notation: component.settings.notation
    });
  });

  it('should toggle note names', () => {
    component.toggleNoteNames();
    expect(settingsService.toggleNoteNames).toHaveBeenCalled();
  });

  it('should reset settings with confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    component.resetSettings();

    expect(window.confirm).toHaveBeenCalled();
    expect(settingsService.resetToDefaults).toHaveBeenCalled();
  });

  it('should not reset settings without confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);

    component.resetSettings();

    expect(window.confirm).toHaveBeenCalled();
    expect(settingsService.resetToDefaults).not.toHaveBeenCalled();
  });
});

