import * as alphaTab from '@coderline/alphatab';
import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import styles from './styles.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as solid from '@fortawesome/free-solid-svg-icons';
import { useAlphaTabEvent } from '@site/src/hooks';
import { openFile, openInputFile } from '@site/src/utils';
import { PlayerProgressIndicator } from '../AlphaTabFull/player-progress-indicator';
import { GoogleDrivePicker } from './google-drive-picker';

export interface PlayerControlsGroupProps {
    sidePanel: SidePanel;
    onSidePanelChange: (sidePanel: SidePanel) => void;
    bottomPanel: BottomPanel;
    onBottomPanelChange: (bottomPanel: BottomPanel) => void;
    api: alphaTab.AlphaTabApi;
    currentFileName: string | null;
    setCurrentFileName: (name: string | null) => void;
    isDownloading: boolean;
    setIsDownloading: (isDownloading: boolean) => void;
    onGoogleDriveFileSelect: (file: { id: string, name: string }) => Promise<void>;
}



export enum SidePanel {
    None = 0,
    Settings = 1,
    TrackSelector = 2
}

export enum BottomPanel {
    None = 0,
    MediaSyncEditor = 1
}

export const QuickSettings: React.FC<{ api: alphaTab.AlphaTabApi }> = ({ api }) => {
    const [fretFormatter, setFretFormatter] = useState<string>(
        (api.settings.notation.tablatureFretFormatter as string) || ''
    );
    const [scrollMode, setScrollMode] = useState<alphaTab.ScrollMode>(api.settings.player.scrollMode);
    const [layoutMode, setLayoutMode] = useState<alphaTab.LayoutMode>(api.settings.display.layoutMode);
    const [zoom, setZoom] = useState<number>(api.settings.display.scale);
    const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(api.metronomeVolume > 0);
    const [currentBpm, setCurrentBpm] = useState<number>(0);

    useEffect(() => {
        if (api.score) {
            setCurrentBpm(api.score.tempo);
        }
    }, [api]);

    useAlphaTabEvent(api, 'settingsUpdated', () => {
        setScrollMode(api.settings.player.scrollMode);
        setFretFormatter((api.settings.notation.tablatureFretFormatter as string) || '');
        setLayoutMode(api.settings.display.layoutMode);
        setZoom(api.settings.display.scale);
        setMetronomeEnabled(api.metronomeVolume > 0);
    });

    useAlphaTabEvent(api, 'scoreLoaded', (score) => {
        setCurrentBpm(score.tempo);
    });

    useAlphaTabEvent(api, 'playerPositionChanged', (args) => {
        const currentTick = args.currentTick;
        if (!api.score) return;
        let newBpm = api.score.tempo;

        for (const mb of api.score.masterBars) {
            if (mb.start > currentTick) break;

            const mbAny = mb as any;
            if (typeof mbAny.tempo === 'number') {
                newBpm = mbAny.tempo;
            }
            if (mbAny.tempoAutomation?.value) {
                newBpm = mbAny.tempoAutomation.value;
            }
            if (mbAny.tempoChanges) {
                for (const tc of mbAny.tempoChanges) {
                    if (tc.tick <= currentTick) {
                        newBpm = tc.tempo;
                    }
                }
            }
        }

        setCurrentBpm(newBpm);
    });

    const onMetronomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const enabled = e.target.checked;
        api.metronomeVolume = enabled ? 1 : 0;
        setMetronomeEnabled(enabled);
    };

    const onFretFormatterChange = (value: string) => {
        setFretFormatter(value);
        api.settings.notation.tablatureFretFormatter = value;
        api.updateSettings();
        api.render();
    };

    const onScrollModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.checked ? alphaTab.ScrollMode.Continuous : alphaTab.ScrollMode.Off;
        api.settings.player.scrollMode = newValue;
        api.updateSettings();
        setScrollMode(newValue);
    };

    const onLayoutModeChange = (mode: alphaTab.LayoutMode) => {
        api.settings.display.layoutMode = mode;
        api.updateSettings();
        api.render();
        setLayoutMode(mode);
    };

    const updateZoom = (newZoom: number) => {
        const clampedZoom = Math.max(0.2, Math.min(3.0, newZoom));
        api.settings.display.scale = clampedZoom;
        api.updateSettings();
        api.render();
        setZoom(clampedZoom);
    };

    const onZoomIn = () => {
        updateZoom(Math.round((zoom + 0.1) * 10) / 10);
    };

    const onZoomOut = () => {
        updateZoom(Math.round((zoom - 0.1) * 10) / 10);
    };

    return (
        <div className={styles['at-player-center']}>
            <span style={{ fontSize: '0.8em', fontWeight: 'bold' }}>Fret:</span>
            <label className={fretFormatter === '' ? styles.active : ''} title="Default (Numbers)">
                <input
                    type="radio"
                    name="fretFormatter"
                    value=""
                    checked={fretFormatter === ''}
                    onChange={() => onFretFormatterChange('')}
                />
                <FontAwesomeIcon icon={solid.faHashtag} />
            </label>
            <label className={fretFormatter === 'NoteName' ? styles.active : ''} title="Note Names">
                <input
                    type="radio"
                    name="fretFormatter"
                    value="NoteName"
                    checked={fretFormatter === 'NoteName'}
                    onChange={() => onFretFormatterChange('NoteName')}
                />
                <FontAwesomeIcon icon={solid.faMusic} />
            </label>

            <span style={{ fontSize: '0.8em', fontWeight: 'bold', marginLeft: '10px' }}>Layout:</span>
            <label className={layoutMode === alphaTab.LayoutMode.Page ? styles.active : ''} title="Page">
                <input
                    type="radio"
                    name="layoutMode"
                    value={alphaTab.LayoutMode.Page}
                    checked={layoutMode === alphaTab.LayoutMode.Page}
                    onChange={() => onLayoutModeChange(alphaTab.LayoutMode.Page)}
                />
                <FontAwesomeIcon icon={solid.faFileLines} />
            </label>
            <label className={layoutMode === alphaTab.LayoutMode.Horizontal ? styles.active : ''} title="Horizontal">
                <input
                    type="radio"
                    name="layoutMode"
                    value={alphaTab.LayoutMode.Horizontal}
                    checked={layoutMode === alphaTab.LayoutMode.Horizontal}
                    onChange={() => onLayoutModeChange(alphaTab.LayoutMode.Horizontal)}
                />
                <FontAwesomeIcon icon={solid.faGripLines} />
            </label>
            
            <span style={{ fontSize: '0.8em', fontWeight: 'bold', marginLeft: '10px' }}>Follow:</span>
            <label className={scrollMode !== alphaTab.ScrollMode.Off ? styles.active : ''} title="Follow Cursor">
                <input
                    type="checkbox"
                    checked={scrollMode !== alphaTab.ScrollMode.Off}
                    onChange={onScrollModeChange}
                />
                <FontAwesomeIcon icon={scrollMode !== alphaTab.ScrollMode.Off ? solid.faEye : solid.faEyeSlash} />
            </label>

            <span style={{ fontSize: '0.8em', fontWeight: 'bold', marginLeft: '10px' }}>Metro:</span>
            <label className={metronomeEnabled ? styles.active : ''} title="Metronome">
                <input
                    type="checkbox"
                    checked={metronomeEnabled}
                    onChange={onMetronomeChange}
                />
                <FontAwesomeIcon icon={solid.faDrum} />
            </label>

            <span style={{ fontSize: '0.8em', fontWeight: 'bold', marginLeft: '10px' }}>BPM:</span>
            <span style={{ fontSize: '0.8em', marginLeft: '5px' }}>{currentBpm}</span>

            <span style={{ fontSize: '0.8em', fontWeight: 'bold', marginLeft: '10px' }}>Zoom:</span>
            <div className={styles['zoom-control']}>
                <button type="button" onClick={onZoomOut}>
                    <FontAwesomeIcon icon={solid.faMinus} />
                </button>
                <span className={styles['zoom-value']}>{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={onZoomIn}>
                    <FontAwesomeIcon icon={solid.faPlus} />
                </button>
            </div>
        </div>
    );
};

export const PlayerControlsGroup: React.FC<PlayerControlsGroupProps> = ({
    api,
    sidePanel,
    onSidePanelChange,
    bottomPanel,
    onBottomPanelChange,
    currentFileName,
    setCurrentFileName,
    isDownloading,
    onGoogleDriveFileSelect
}) => {

    const [soundFontLoadPercentage, setSoundFontLoadPercentage] = useState(0);
    const [isPlaying, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [endTime, setEndTime] = useState(1);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const formatDuration = (milliseconds: number) => {
        let seconds = milliseconds / 1000;
        const minutes = (seconds / 60) | 0;
        seconds = (seconds - minutes * 60) | 0;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    useAlphaTabEvent(api, 'playerPositionChanged', (args) => {
        setCurrentTime(args.currentTime);
        setEndTime(args.endTime);
    });

    useAlphaTabEvent(api, 'playerStateChanged', (args) => {
        setPlaying(args.state === alphaTab.synth.PlayerState.Playing);
    });

    return (
        <>
            <div className={styles['at-time-slider']}>
                <div
                    className={styles['at-time-slider-value']}
                    style={{
                        width: `${((currentTime / endTime) * 100).toFixed(2)}%`
                    }}
                />
            </div>
            <div className={`${styles['at-player']} ${isMobileMenuOpen ? styles['mobile-open'] : ''}`}>
                <div className={styles['at-player-left']}>
                    <div className={styles['mobile-main-controls']}>
                        <button
                            type="button"
                            onClick={e => {
                                e.preventDefault();
                                api.playPause();
                            }}
                            data-tooltip-id="tooltip-playground"
                            data-tooltip-content="Play/Pause"
                            className={`${api.isReadyForPlayback ? '' : ' disabled'}`}>
                            <FontAwesomeIcon icon={isPlaying ? solid.faPause : solid.faPlay} />
                        </button>

                        {(api.score || currentFileName) && (
                            <div className={styles['at-song-details']}>
                                <span className={styles['at-song-title']}>
                                    {api.score ? (api.score.title || currentFileName || 'Untitled') : currentFileName}
                                </span>
                            </div>
                        )}
                        <div className={styles['at-time-position']}>
                            {formatDuration(currentTime)} / {formatDuration(endTime)}
                        </div>
                    </div>

                    <div className={styles['mobile-extra-controls']}>
                        <div className={styles['at-player-left-group']}>
                            <button
                                type="button"
                                onClick={e => {
                                    e.preventDefault();
                                    openInputFile(api, (name) => setCurrentFileName(name));
                                }}
                                data-tooltip-id="tooltip-playground"
                                data-tooltip-content="Open File">
                                <FontAwesomeIcon icon={solid.faFolderOpen} /> <span className={styles['button-text']}>Open File</span>
                            </button>

                            <GoogleDrivePicker
                                onFileSelect={onGoogleDriveFileSelect}
                            >
                                <span className={styles['button-text']}>Google Drive</span>
                            </GoogleDrivePicker>
                            <PlayerProgressIndicator percentage={soundFontLoadPercentage} />
                        </div>

                        <div className={styles['at-player-center']}>
                            <QuickSettings api={api} />
                        </div>

                        <div className={styles['at-player-right']}>
                            <button
                                type="button"
                                onClick={e => {
                                    e.preventDefault();
                                    if (bottomPanel === BottomPanel.MediaSyncEditor) {
                                        onBottomPanelChange(BottomPanel.None);
                                    } else {
                                        onBottomPanelChange(BottomPanel.MediaSyncEditor);
                                    }
                                }}
                                className={bottomPanel === BottomPanel.MediaSyncEditor ? styles.active : ''}>
                                <FontAwesomeIcon icon={solid.faTimeline} /> <span className={styles['button-text']}>Media Sync</span>
                            </button>
                            <button
                                type="button"
                                onClick={e => {
                                    e.preventDefault();
                                    if (sidePanel === SidePanel.TrackSelector) {
                                        onSidePanelChange(SidePanel.None);
                                    } else {
                                        onSidePanelChange(SidePanel.TrackSelector);
                                    }
                                }}
                                className={sidePanel === SidePanel.TrackSelector ? styles.active : ''}>
                                <FontAwesomeIcon icon={solid.faListCheck} /> <span className={styles['button-text']}>Tracks</span>
                            </button>
                            <button
                                type="button"
                                onClick={e => {
                                    e.preventDefault();
                                    if (sidePanel === SidePanel.Settings) {
                                        onSidePanelChange(SidePanel.None);
                                    } else {
                                        onSidePanelChange(SidePanel.Settings);
                                    }
                                }}
                                className={sidePanel === SidePanel.Settings ? styles.active : ''}>
                                <FontAwesomeIcon icon={solid.faGear} /> <span className={styles['button-text']}>Settings</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles['mobile-toggler']}>
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className={isMobileMenuOpen ? styles.active : ''}
                    >
                        <FontAwesomeIcon icon={isMobileMenuOpen ? solid.faChevronDown : solid.faChevronUp} />
                    </button>
                </div>
            </div>

            {isDownloading && (
                <div className={styles['drive-download-overlay']}>
                    <div className={styles['drive-download-content']}>
                        <FontAwesomeIcon icon={solid.faSpinner} spin />
                        <span>Opening from Google Drive...</span>
                    </div>
                </div>
            )}
        </>
    );
};
