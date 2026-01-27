'use client';

import * as alphaTab from '@coderline/alphatab';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAlphaTab, useAlphaTabEvent } from '@site/src/hooks';
import styles from './styles.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as solid from '@fortawesome/free-solid-svg-icons';
import { openFile } from '@site/src/utils';
import { BottomPanel, PlayerControlsGroup, SidePanel } from './player-controls-group';
import { PlaygroundSettings } from './playground-settings';
import { Tooltip } from 'react-tooltip';
import { PlaygroundTrackSelector } from './track-selector';
import { MediaSyncEditor } from './media-sync-editor';
import { DefaultScreenMode, type HTMLMediaElementLike, MediaType, type MediaTypeState } from './helpers';
import { YouTubePlayer } from './youtube-player';
import { openInputFile } from '@site/src/utils';
import { GoogleDrivePicker } from './google-drive-picker';


export const AlphaTabPlayground: React.FC = () => {
    const viewPortRef = React.createRef<HTMLDivElement>();
    const [isLoading, setLoading] = useState(true);
    const [sidePanel, setSidePanel] = useState(SidePanel.None);
    const [bottomPanel, setBottomPanel] = useState(BottomPanel.None);
    const [mediaType, setMediaType] = useState<MediaTypeState>({
        type: MediaType.Synth
    });
    const [currentFileName, setCurrentFileName] = useState<string | null>(null);
    const [trackSettingsId, setTrackSettingsId] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const hasAttemptedStartupLoad = useRef(false);
    
    const youtubePlayer = useRef<HTMLMediaElementLike | null>(null);


    const [api, element] = useAlphaTab(s => {
        s.core.engine = 'svg';
        
        const hasSavedFile = typeof window !== 'undefined' && 
                             localStorage.getItem('google_drive_last_file') && 
                             localStorage.getItem('google_drive_save_selection') === 'true' &&
                             localStorage.getItem('google_drive_access_token');

        if (!hasSavedFile) {

            const defaultScreen = typeof window !== 'undefined' ? localStorage.getItem('alphaTab_defaultScreen') : null;
            const defaultScreenMode = defaultScreen !== null ? JSON.parse(defaultScreen) : DefaultScreenMode.DefaultTab;
            
            if (defaultScreenMode === DefaultScreenMode.DefaultTab) {
                s.core.file = '/files/canon-full.gp';
                s.core.tracks = [0, 1];
            }
        }

        s.player.scrollElement = viewPortRef.current!;
        s.player.scrollOffsetY = -10;
        s.player.playerMode = alphaTab.PlayerMode.EnabledSynthesizer;
        s.player.scrollMode = alphaTab.ScrollMode.Continuous;

        s.notation.tablatureFretFormatter = 'NoteName';
        
        // Use default file path as initial track settings ID
        const defaultScreen = typeof window !== 'undefined' ? localStorage.getItem('alphaTab_defaultScreen') : null;
        const defaultScreenMode = defaultScreen !== null ? JSON.parse(defaultScreen) : DefaultScreenMode.DefaultTab;
        if (defaultScreenMode === DefaultScreenMode.DefaultTab) {
            setTrackSettingsId('/files/canon-full.gp');
        }
    });


    useAlphaTabEvent(api, 'renderFinished', () => {
        setLoading(false);
    });

    useEffect(() => {
        if (!api) {
            return;
        }

        const hasSavedFile = typeof window !== 'undefined' && 
                             localStorage.getItem('google_drive_last_file') && 
                             localStorage.getItem('google_drive_save_selection') === 'true' &&
                             localStorage.getItem('google_drive_access_token');

        if (!hasSavedFile) {
            const defaultScreen = typeof window !== 'undefined' ? localStorage.getItem('alphaTab_defaultScreen') : null;
            const defaultScreenMode = defaultScreen !== null ? JSON.parse(defaultScreen) : DefaultScreenMode.DefaultTab;
            
            if (defaultScreenMode === DefaultScreenMode.EmptyView) {
                setLoading(false);
            }
        }
    }, [api]);


    useAlphaTabEvent(api, 'scoreLoaded', score => {
        if (score.backingTrack?.rawAudioFile) {
            setMediaType({
                type: MediaType.Audio,
                audioFile: score.backingTrack!.rawAudioFile
            });
        } else {
            setMediaType({
                type: MediaType.Synth
            });
        }

        if (trackSettingsId && typeof window !== 'undefined') {
            const savedSelectedTracks = localStorage.getItem(`at-selected-tracks:${trackSettingsId}`);
            if (savedSelectedTracks) {
                try {
                    const indices = JSON.parse(savedSelectedTracks) as number[];
                    const currentIndices = api!.tracks.map(t => t.index);
                    const isSame = 
                        indices.length === currentIndices.length && 
                        indices.every(i => currentIndices.includes(i));
                    
                    if (!isSame) {
                        const tracks = score.tracks.filter(t => indices.includes(t.index));
                        if (tracks.length > 0) {
                            api!.renderTracks(tracks);
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse saved selected tracks', e);
                }
            }

            score.tracks.forEach(track => {
                const muteKey = `at-track-mute:${trackSettingsId}:${track.index}`;
                const soloKey = `at-track-solo:${trackSettingsId}:${track.index}`;
                const volumeKey = `at-track-volume:${trackSettingsId}:${track.index}`;
                const transposeAudioKey = `at-track-transpose-audio:${trackSettingsId}:${track.index}`;
                const transposeFullKey = `at-track-transpose-full:${trackSettingsId}:${track.index}`;

                const savedMute = localStorage.getItem(muteKey);
                if (savedMute !== null) track.playbackInfo.isMute = savedMute === 'true';

                const savedSolo = localStorage.getItem(soloKey);
                if (savedSolo !== null) track.playbackInfo.isSolo = savedSolo === 'true';

                const savedVolume = localStorage.getItem(volumeKey);
                if (savedVolume !== null) track.playbackInfo.volume = parseFloat(savedVolume);

                const savedTransposeAudio = localStorage.getItem(transposeAudioKey);
                if (savedTransposeAudio !== null) {
                    track.playbackInfo.transpositionPitch = parseInt(savedTransposeAudio);
                }
                
                const savedTransposeFull = localStorage.getItem(transposeFullKey);
                if (savedTransposeFull !== null) {
                    const pitches = api!.settings.notation.transpositionPitches;
                    while (pitches.length < track.index + 1) pitches.push(0);
                    pitches[track.index] = parseInt(savedTransposeFull);
                }

                track.staves.forEach(staff => {
                    const staffSettingsKey = `at-staff-settings:${trackSettingsId}:${track.index}:${staff.index}`;
                    const savedStaff = localStorage.getItem(staffSettingsKey);
                    if (savedStaff) {
                        try {
                            const options = JSON.parse(savedStaff);
                            staff.showNumbered = options.showNumbered;
                            staff.showSlash = options.showSlash;
                            staff.showTablature = options.showTablature;
                            staff.showStandardNotation = options.showStandardNotation;
                        } catch (e) {
                            console.error('Failed to parse saved staff settings', e);
                        }
                    }
                });
            });
            api!.updateSettings();
        }
    }, [trackSettingsId]);

    useAlphaTabEvent(api, 'playerPositionChanged', () => {
        if (api?.settings.player.scrollMode !== alphaTab.ScrollMode.Off) {
            api?.scrollToCursor();
        }
    });

    const onDragOver = (e: React.DragEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'link';
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (e.dataTransfer) {
            const files = e.dataTransfer.files;
            if (files.length === 1) {
                setTrackSettingsId(files[0].name);
                openFile(api!, files[0]);
            }
        }
    };

    const youtubePlayerUnsubscribe = useRef<() => void>(null);
    const setYoutubePlayer = useCallback(
        (newPlayer: HTMLMediaElementLike) => {
            if (youtubePlayerUnsubscribe.current) {
                youtubePlayerUnsubscribe.current();
                youtubePlayerUnsubscribe.current = null;
            }

            if (newPlayer && api) {
                youtubePlayer.current = newPlayer;

                const onLoadedMetadata = () => {
                    setMediaType(t => ({
                        ...t,
                        youtubeVideoDuration: newPlayer.duration * 1000
                    }));
                };
                const onTimeUpdate = () => {
                    if (api!.actualPlayerMode === alphaTab.PlayerMode.EnabledExternalMedia) {
                        (api!.player!.output as alphaTab.synth.IExternalMediaSynthOutput).updatePosition(
                            newPlayer.currentTime * 1000
                        );
                    }
                };

                const onPlay = () => {
                    api.play();
                };
                const onPause = () => {
                    api.pause();
                };

                const onEnded = () => {
                    api.pause();
                };

                const onVolumeChange = () => {
                    api.masterVolume = newPlayer.volume;
                };

                const onRateChange = () => {
                    api.playbackSpeed = newPlayer.playbackRate;
                };

                newPlayer.addEventListener('loadedmetadata', onLoadedMetadata);
                newPlayer.addEventListener('timeupdate', onTimeUpdate);
                newPlayer.addEventListener('seeked', onTimeUpdate);
                newPlayer.addEventListener('play', onPlay);
                newPlayer.addEventListener('pause', onPause);
                newPlayer.addEventListener('ended', onEnded);
                newPlayer.addEventListener('volumechange', onVolumeChange);
                newPlayer.addEventListener('ratechange', onRateChange);

                youtubePlayerUnsubscribe.current = () => {
                    newPlayer.removeEventListener('loadedmetadata', onLoadedMetadata);
                    newPlayer.removeEventListener('timeupdate', onTimeUpdate);
                    newPlayer.removeEventListener('seeked', onTimeUpdate);
                    newPlayer.removeEventListener('play', onPlay);
                    newPlayer.removeEventListener('pause', onPause);
                    newPlayer.removeEventListener('ended', onEnded);
                    newPlayer.removeEventListener('volumechange', onVolumeChange);
                    newPlayer.removeEventListener('ratechange', onRateChange);
                };
            }
        },
        [api]
    );

    useEffect(() => {
        if (!api) {
            return;
        }
        api.pause();
        switch (mediaType.type) {
            case MediaType.Synth:
                api.settings.player.playerMode = alphaTab.PlayerMode.EnabledSynthesizer;
                api.updateSettings();
                break;

            case MediaType.Audio:
                api.settings.player.playerMode = alphaTab.PlayerMode.EnabledBackingTrack;
                api.updateSettings();

                break;

            case MediaType.YouTube:
                api.settings.player.playerMode = alphaTab.PlayerMode.EnabledExternalMedia;
                api.updateSettings();

                const handler: alphaTab.synth.IExternalMediaHandler = {
                    get backingTrackDuration() {
                        const duration = youtubePlayer.current?.duration ?? 0;
                        return Number.isFinite(duration) ? duration * 1000 : 0;
                    },
                    get playbackRate() {
                        return youtubePlayer.current?.duration ?? 1;
                    },
                    set playbackRate(value) {
                        if (youtubePlayer.current) {
                            youtubePlayer.current.playbackRate = value;
                        }
                    },
                    get masterVolume() {
                        return youtubePlayer.current?.volume ?? 1;
                    },
                    set masterVolume(value) {
                        if (youtubePlayer.current) {
                            youtubePlayer.current.volume = value;
                        }
                    },
                    seekTo(time) {
                        if (youtubePlayer.current) {
                            youtubePlayer.current.currentTime = time / 1000;
                        }
                    },
                    play() {
                        if (youtubePlayer.current) {
                            youtubePlayer.current.play();
                        }
                    },
                    pause() {
                        if (youtubePlayer.current) {
                            youtubePlayer.current.pause();
                        }
                    }
                };

                (api.player!.output as alphaTab.synth.IExternalMediaSynthOutput).handler = handler;

                break;
        }
    }, [api, mediaType.type]);

    useEffect(() => {
        if (!api) {
            return;
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                    return;
                }
                e.preventDefault();
                api.playPause();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [api]);

    // Handle startup load from Google Drive if saved
    useEffect(() => {
        if (!api || hasAttemptedStartupLoad.current) return;
        
        const savedFileStr = localStorage.getItem('google_drive_last_file');
        const saveSelection = localStorage.getItem('google_drive_save_selection') === 'true';
        const accessToken = localStorage.getItem('google_drive_access_token');
        
        if (savedFileStr && saveSelection && accessToken) {
            hasAttemptedStartupLoad.current = true;
            try {
                const file = JSON.parse(savedFileStr);
                setIsDownloading(true);
                
                // Give AlphaTab a moment to initialize before overriding the default load
                setTimeout(() => {
                    setCurrentFileName(file.name);
                    fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    })
                    .then(response => {
                        if (!response.ok) {
                            if (response.status === 401) {
                                localStorage.removeItem('google_drive_access_token');
                                throw new Error('Unauthorized');
                            }
                            throw new Error('Failed to download');
                        }
                        return response.arrayBuffer();
                    })
                    .then(arrayBuffer => {
                        setTrackSettingsId(file.id);
                        api.load(new Uint8Array(arrayBuffer)); 
                        console.log('Last Google Drive file loaded on startup:', file.name);
                    })
                    .catch(e => {
                        console.error('Error loading last file on startup:', e);
                        
                        if (api) {
                            try { api.stop(); } catch(err) {/* ignore */}
                        }

                        // Fallback to default file if startup load fails
                        const defaultScreen = localStorage.getItem('alphaTab_defaultScreen');
                        const defaultScreenMode = defaultScreen !== null ? JSON.parse(defaultScreen) : DefaultScreenMode.DefaultTab;
                        
                        if (defaultScreenMode === DefaultScreenMode.DefaultTab) {
                            const defaultFile = '/files/canon-full.gp';
                            setTrackSettingsId(defaultFile);
                            api.load(defaultFile, [0, 1]);
                            setCurrentFileName('Canon');
                        } else {
                            setLoading(false);
                            setTrackSettingsId(null);
                            setCurrentFileName(null);
                        }
                        setIsDownloading(false);
                    })
                    .finally(() => {
                        setTimeout(() => setIsDownloading(false), 500);
                    });
                }, 100);
            } catch (e) {
                console.error('Failed to parse last saved file', e);
                setIsDownloading(false);
            }
        }
    }, [api]);

    const onGoogleDriveFileSelect = async (file: { id: string, name: string }) => {
        try {
            setIsDownloading(true);
            setCurrentFileName(file.name);
            console.log('Selected file from Google Drive:', file);
            
            const accessToken = localStorage.getItem('google_drive_access_token');
            if (!accessToken) {
                setIsDownloading(false);
                console.error('No access token available');
                alert('Please sign in to Google Drive first');
                return;
            }

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

            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            setTrackSettingsId(file.id);
            api!.load(uint8Array, [0]);
            
            const saveSelection = localStorage.getItem('google_drive_save_selection') === 'true';
            if (saveSelection) {
                localStorage.setItem('google_drive_last_file', JSON.stringify({
                    id: file.id,
                    name: file.name
                }));
            }
            
            console.log('File loaded successfully into AlphaTab');
        } catch (error) {
            console.error('Error loading file from Google Drive:', error);
            alert('Failed to load file from Google Drive. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };


    return (
        <>
            <div className={styles['at-wrap']} onDragOver={onDragOver} onDrop={onDrop}>
                {isLoading && (
                    <div className={styles['at-overlay']}>
                        <div className={styles['at-overlay-content']}>
                            <FontAwesomeIcon icon={solid.faSpinner} size="2x" spin={true} />
                        </div>
                    </div>
                )}

                {api && api?.score && (
                    <PlaygroundSettings
                        api={api}
                        onClose={() => setSidePanel(SidePanel.None)}
                        isOpen={sidePanel === SidePanel.Settings}
                    />
                )}

                {api && api?.score && (
                    <PlaygroundTrackSelector
                        api={api}
                        onClose={() => setSidePanel(SidePanel.None)}
                        isOpen={sidePanel === SidePanel.TrackSelector}
                        trackSettingsId={trackSettingsId}
                    />
                )}

                <div className={styles['at-content']}>
                    <div className={styles['at-viewport']} ref={viewPortRef}>
                        <div ref={element} />
                        {api && !api.score && !isLoading && (
                            <div className={styles['at-empty-view']}>
                                <div className={styles['at-empty-view-content']}>
                                    <button
                                        type="button"
                                        className="button button--primary button--lg"
                                        onClick={e => {
                                            e.preventDefault();
                                            openInputFile(api, name => {
                                                setCurrentFileName(name);
                                                setTrackSettingsId(name);
                                            });
                                        }}>
                                        <FontAwesomeIcon icon={solid.faFolderOpen} /> Open File
                                    </button>
                                    <div className={styles['at-empty-view-divider']}>or</div>
                                    <GoogleDrivePicker
                                        className="button button--secondary button--lg"
                                        onFileSelect={onGoogleDriveFileSelect}
                                    />
                                </div>
                            </div>
                        )}
                    </div>


                    {mediaType.type === MediaType.YouTube && (
                        <div className={styles.video}>
                            <YouTubePlayer ref={setYoutubePlayer} src={mediaType.youtubeUrl!} />
                        </div>
                    )}
                </div>

                <div className={styles['at-footer']}>
                    {api && api?.score && bottomPanel === BottomPanel.MediaSyncEditor && (
                        <MediaSyncEditor
                            api={api}
                            score={api!.score}
                            mediaType={mediaType}
                            onMediaTypeChange={t => setMediaType(t)}
                            youtubePlayer={youtubePlayer.current ?? undefined}
                        />
                    )}
                    {api && (
                        <PlayerControlsGroup
                            api={api}
                            sidePanel={sidePanel}
                            onSidePanelChange={setSidePanel}
                            bottomPanel={bottomPanel}
                            onBottomPanelChange={setBottomPanel}
                            currentFileName={currentFileName}
                            setCurrentFileName={setCurrentFileName}
                            isDownloading={isDownloading}
                            setIsDownloading={setIsDownloading}
                            onGoogleDriveFileSelect={onGoogleDriveFileSelect}
                        />
                    )}

                </div>
            </div>
            <Tooltip anchorSelect="[data-tooltip-content]" id="tooltip-playground" style={{ zIndex: 1200 }} />
        </>
    );
};
