import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerControlsComponent } from './player-controls.component';
import { AlphaTabService } from '../../services/alphatab.service';

describe('PlayerControlsComponent', () => {
  let component: PlayerControlsComponent;
  let fixture: ComponentFixture<PlayerControlsComponent>;
  let alphaTabService: jasmine.SpyObj<AlphaTabService>;

  beforeEach(async () => {
    const alphaTabServiceSpy = jasmine.createSpyObj('AlphaTabService', [
      'playPause',
      'stop',
      'loadFile'
    ]);

    await TestBed.configureTestingModule({
      imports: [PlayerControlsComponent],
      providers: [
        { provide: AlphaTabService, useValue: alphaTabServiceSpy }
      ]
    }).compileComponents();

    alphaTabService = TestBed.inject(AlphaTabService) as jasmine.SpyObj<AlphaTabService>;
    fixture = TestBed.createComponent(PlayerControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle play/pause state', () => {
    expect(component.isPlaying).toBe(false);

    component.playPause();
    expect(component.isPlaying).toBe(true);
    expect(alphaTabService.playPause).toHaveBeenCalled();

    component.playPause();
    expect(component.isPlaying).toBe(false);
  });

  it('should stop playback', () => {
    component.isPlaying = true;

    component.stop();

    expect(component.isPlaying).toBe(false);
    expect(alphaTabService.stop).toHaveBeenCalled();
  });

  it('should call openSettings callback', () => {
    const mockCallback = jasmine.createSpy('openSettings');
    component.onOpenSettings = mockCallback;

    component.openSettings();

    expect(mockCallback).toHaveBeenCalled();
  });

  it('should load file when selected', () => {
    const mockFile = new File(['content'], 'test.gp5', { type: 'application/octet-stream' });
    const mockEvent = {
      target: {
        files: [mockFile]
      }
    } as any;

    component.loadFile(mockEvent);

    expect(alphaTabService.loadFile).toHaveBeenCalledWith(mockFile);
  });

  it('should not load file if no file selected', () => {
    const mockEvent = {
      target: {
        files: null
      }
    } as any;

    component.loadFile(mockEvent);

    expect(alphaTabService.loadFile).not.toHaveBeenCalled();
  });
});

