import * as alphaTab from '@coderline/alphatab';
import type React from 'react';
import { useState } from 'react';
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
    onBottomPanelChange: (sidePanel: BottomPanel) => void;
    api: alphaTab.AlphaTabApi;
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

    const onFretFormatterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setFretFormatter(newValue);
        api.settings.notation.tablatureFretFormatter = newValue;
        api.updateSettings();
        api.render();
    };

    return (
        <div className={styles['at-player-center']}>
            <span style={{ fontSize: '0.8em', fontWeight: 'bold' }}>Fret:</span>
            <label className={fretFormatter === '' ? styles.active : ''}>
                <input
                    type="radio"
                    name="fretFormatter"
                    value=""
                    checked={fretFormatter === ''}
                    onChange={onFretFormatterChange}
                />
                Default
            </label>
            <label className={fretFormatter === 'NoteName' ? styles.active : ''}>
                <input
                    type="radio"
                    name="fretFormatter"
                    value="NoteName"
                    checked={fretFormatter === 'NoteName'}
                    onChange={onFretFormatterChange}
                />
                NoteName
            </label>
        </div>
    );
};

export const PlayerControlsGroup: React.FC<PlayerControlsGroupProps> = ({
    api,
    sidePanel,
    onSidePanelChange,
    bottomPanel,
    onBottomPanelChange
}) => {
    const [soundFontLoadPercentage, setSoundFontLoadPercentage] = useState(0);
    const [isPlaying, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [endTime, setEndTime] = useState(1);

    useAlphaTabEvent(api, 'soundFontLoad', e => {
        setSoundFontLoadPercentage(e.loaded / e.total);
    });

    useAlphaTabEvent(api, 'soundFontLoaded', () => {
        setSoundFontLoadPercentage(1);
    });
    useAlphaTabEvent(api, 'playerStateChanged', e => {
        setPlaying(e.state === alphaTab.synth.PlayerState.Playing);
    });
    useAlphaTabEvent(api, 'playerPositionChanged', e => {
        // reduce number of UI updates to second changes.
        const previousCurrentSeconds = (currentTime / 1000) | 0;
        const newCurrentSeconds = (e.currentTime / 1000) | 0;

        if (e.endTime === endTime && (previousCurrentSeconds === newCurrentSeconds || newCurrentSeconds === 0)) {
            return;
        }

        setEndTime(e.endTime);
        setCurrentTime(e.currentTime);
    });

    const formatDuration = (milliseconds: number) => {
        let seconds = milliseconds / 1000;
        const minutes = (seconds / 60) | 0;
        seconds = (seconds - minutes * 60) | 0;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

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
            <div className={styles['at-player']}>
                <div className={styles['at-player-left']}>
                    <button
                        type="button"
                        onClick={e => {
                            e.preventDefault();
                            openInputFile(api);
                        }}
                        data-tooltip-id="tooltip-playground"
                        data-tooltip-content="Open File">
                        <FontAwesomeIcon icon={solid.faFolderOpen} />
                    </button>

                    <GoogleDrivePicker
                        onFileSelect={async file => {
                            try {
                                console.log('Selected file from Google Drive:', file);
                                
                                // Get the access token from localStorage
                                const accessToken = localStorage.getItem('google_drive_access_token');
                                if (!accessToken) {
                                    console.error('No access token available');
                                    return;
                                }

                                // Download the file
                                const response = await fetch(
                                    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
                                    {
                                        headers: {
                                            Authorization: `Bearer ${accessToken}`
                                        }
                                    }
                                );

                                if (!response.ok) {
                                    throw new Error('Failed to download file');
                                }

                                // Load the file into AlphaTab
                                const arrayBuffer = await response.arrayBuffer();
                                const uint8Array = new Uint8Array(arrayBuffer);
                                api.load(uint8Array, [0]);
                                
                                console.log('File loaded successfully into AlphaTab');
                            } catch (error) {
                                console.error('Error loading file from Google Drive:', error);
                                alert('Failed to load file from Google Drive. Please try again.');
                            }
                        }}
                    />

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

                    <PlayerProgressIndicator percentage={soundFontLoadPercentage} />

                    {api.score && (
                        <div className={styles['at-song-details']}>
                            <span className={styles['at-song-title']}>{api.score.title}</span>
                            <span> - </span>
                            <span className={styles['at-song-artist']}>{api.score.artist}</span>
                        </div>
                    )}

                    <div className={styles['at-time-position']}>
                        {formatDuration(currentTime)} / {formatDuration(endTime)}
                    </div>
                </div>

                <QuickSettings api={api} />

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
                        <FontAwesomeIcon icon={solid.faTimeline} /> Media Sync
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
                        <FontAwesomeIcon icon={solid.faListCheck} /> Tracks
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
                        <FontAwesomeIcon icon={solid.faGear} /> Settings
                    </button>
                </div>
            </div>
        </>
    );
};
