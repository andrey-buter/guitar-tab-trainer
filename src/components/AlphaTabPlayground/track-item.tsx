import type * as alphaTab from '@coderline/alphatab';
import type React from 'react';
import { useState } from 'react';
import styles from './styles.module.scss';
import { useEffectNoMount } from '@site/src/hooks';

type StaffOptions = {
    showSlash: boolean;
    showNumbered: boolean;
    showTablature: boolean;
    showStandardNotation: boolean;
};

export interface StaffItemProps {
    api: alphaTab.AlphaTabApi;
    staff: alphaTab.model.Staff;
    trackSettingsId: string | null;
}

export const StaffItem: React.FC<StaffItemProps> = ({ api, staff, trackSettingsId }) => {
    const [staffOptions, _setStaffOptions] = useState<StaffOptions>(() => {
        if (trackSettingsId && typeof window !== 'undefined') {
            const saved = localStorage.getItem(`at-staff-settings:${trackSettingsId}:${staff.track.index}:${staff.index}`);
            if (saved) {
                return JSON.parse(saved);
            }
        }
        return {
            showNumbered: staff.showNumbered,
            showSlash: staff.showSlash,
            showTablature: staff.showTablature,
            showStandardNotation: staff.showStandardNotation
        };
    });

    useEffectNoMount(() => {
        for (const key in staffOptions) {
            staff[key] = staffOptions[key];
        }
        if (trackSettingsId && typeof window !== 'undefined') {
            localStorage.setItem(`at-staff-settings:${trackSettingsId}:${staff.track.index}:${staff.index}`, JSON.stringify(staffOptions));
        }
        api.render();
    }, [api, staff, staffOptions, trackSettingsId]);

    const setStaffOptions = (updater: (current: StaffOptions) => StaffOptions) => {
        _setStaffOptions(value => {
            const newValue = updater(value);
            if (!Array.from(Object.keys(newValue)).some(k => newValue[k])) {
                return value;
            }
            return newValue;
        });
    };

    return (
        <div className={`${styles['settings-item']}`}>
            <div className={`${styles['settings-item-label']}`}>Staff {staff.index + 1}</div>
            <div className={`${styles['settings-item-control']} ${styles['button-group']}`}>
                <button
                    type="button"
                    className={`button ${styles['icon-button']} button--sm ${staffOptions.showStandardNotation ? 'button--primary' : 'button--secondary button--outline'}`}
                    disabled={staff.isPercussion}
                    onClick={() => setStaffOptions(o => ({ ...o, showStandardNotation: !o.showStandardNotation }))}
                    data-tooltip-content="Standard Notation"
                    data-tooltip-id="tooltip-playground">
                    𝅘𝅥
                </button>
                <button
                    type="button"
                    className={`button ${styles['icon-button']} button--sm ${staffOptions.showTablature ? 'button--primary' : 'button--secondary button--outline'}`}
                    onClick={() => setStaffOptions(o => ({ ...o, showTablature: !o.showTablature }))}
                    disabled={staff.isPercussion}
                    data-tooltip-content="Guitar Tabs"
                    data-tooltip-id="tooltip-playground">
                    5⤴
                </button>
                <button
                    type="button"
                    className={`button ${styles['icon-button']} button--sm ${staffOptions.showSlash ? 'button--primary' : 'button--secondary button--outline'}`}
                    onClick={() => setStaffOptions(o => ({ ...o, showSlash: !o.showSlash }))}
                    disabled={staff.isPercussion}
                    data-tooltip-content="Slash Notation"
                    data-tooltip-id="tooltip-playground">
                    𝄍
                </button>
                <button
                    type="button"
                    className={`button ${styles['icon-button']} button--sm ${staffOptions.showNumbered ? 'button--primary' : 'button--secondary button--outline'}`}
                    onClick={() => setStaffOptions(o => ({ ...o, showNumbered: !o.showNumbered }))}
                    disabled={staff.isPercussion}
                    data-tooltip-content="Numbered Notation"
                    data-tooltip-id="tooltip-playground">
                    &#818;2&#818;
                </button>
            </div>
        </div>
    );
};

export interface TrackItemProps {
    api: alphaTab.AlphaTabApi;
    track: alphaTab.model.Track;
    isSelected: boolean;
    trackSettingsId: string | null;
}

export const TrackItem: React.FC<TrackItemProps> = ({ api, track, isSelected, trackSettingsId }) => {
    const [isMute, setMute] = useState(() => {
        if (trackSettingsId && typeof window !== 'undefined') {
            const saved = localStorage.getItem(`at-track-mute:${trackSettingsId}:${track.index}`);
            if (saved !== null) return saved === 'true';
        }
        return track.playbackInfo.isMute;
    });

    useEffectNoMount(() => {
        track.playbackInfo.isMute = isMute;
        if (trackSettingsId && typeof window !== 'undefined') {
            localStorage.setItem(`at-track-mute:${trackSettingsId}:${track.index}`, isMute.toString());
        }
        api.changeTrackMute([track], isMute);
    }, [api, track, isMute, trackSettingsId]);

    const [isSolo, setSolo] = useState(() => {
        if (trackSettingsId && typeof window !== 'undefined') {
            const saved = localStorage.getItem(`at-track-solo:${trackSettingsId}:${track.index}`);
            if (saved !== null) return saved === 'true';
        }
        return track.playbackInfo.isSolo;
    });

    useEffectNoMount(() => {
        track.playbackInfo.isSolo = isSolo;
        if (trackSettingsId && typeof window !== 'undefined') {
            localStorage.setItem(`at-track-solo:${trackSettingsId}:${track.index}`, isSolo.toString());
        }
        api.changeTrackSolo([track], isSolo);
    }, [api, track, isSolo, trackSettingsId]);

    const [volume, setVolume] = useState(() => {
        if (trackSettingsId && typeof window !== 'undefined') {
            const saved = localStorage.getItem(`at-track-volume:${trackSettingsId}:${track.index}`);
            if (saved !== null) return parseFloat(saved);
        }
        return track.playbackInfo.volume;
    });

    useEffectNoMount(() => {
        if (trackSettingsId && typeof window !== 'undefined') {
            localStorage.setItem(`at-track-volume:${trackSettingsId}:${track.index}`, volume.toString());
        }
        api.changeTrackVolume([track], volume / track.playbackInfo.volume);
    }, [api, track, volume]);

    const onTrackSelect = (selected: boolean) => {
        let newTracks: alphaTab.model.Track[];
        if (selected) {
            newTracks = [...api.tracks, track];
        } else {
            newTracks = api.tracks.filter(t => t !== track);
            if (newTracks.length === 0) {
                return;
            }
        }

        newTracks.sort((a, b) => a.index - b.index);
        
        if (trackSettingsId && typeof window !== 'undefined') {
            const selectedIndices = newTracks.map(t => t.index);
            localStorage.setItem(`at-selected-tracks:${trackSettingsId}`, JSON.stringify(selectedIndices));
        }
        
        api.renderTracks(newTracks);
    };

    const [transposeAudio, setTransposeAudio] = useState<number>(() => {
        if (trackSettingsId && typeof window !== 'undefined') {
            const saved = localStorage.getItem(`at-track-transpose-audio:${trackSettingsId}:${track.index}`);
            if (saved !== null) return parseInt(saved);
        }
        return 0;
    });
    const [transposeFull, setTransposeFull] = useState<number>(() => {
        if (trackSettingsId && typeof window !== 'undefined') {
            const saved = localStorage.getItem(`at-track-transpose-full:${trackSettingsId}:${track.index}`);
            if (saved !== null) return parseInt(saved);
        }
        return 0;
    });

    useEffectNoMount(() => {
        if (trackSettingsId && typeof window !== 'undefined') {
            localStorage.setItem(`at-track-transpose-audio:${trackSettingsId}:${track.index}`, transposeAudio.toString());
        }
        api.changeTrackTranspositionPitch([track], transposeAudio);
    }, [api, track, transposeAudio, trackSettingsId]);

    useEffectNoMount(() => {
        const pitches = api.settings.notation.transpositionPitches;
        while (pitches.length < track.index + 1) {
            pitches.push(0);
        }
        pitches[track.index] = transposeFull;
        if (trackSettingsId && typeof window !== 'undefined') {
            localStorage.setItem(`at-track-transpose-full:${trackSettingsId}:${track.index}`, transposeFull.toString());
        }
        api.updateSettings();
        api.render();
    }, [api, track, transposeFull, trackSettingsId]);

    return (
        <div className={styles['track-item']} key={track.index}>
            <div className={`${styles['settings-item']} ${styles['track-item-info']}`}>
                <div className={`${`${styles['settings-item-label']} `}`}>
                    <input
                        type="checkbox"
                        id={`t-${track.index}`}
                        checked={isSelected}
                        onChange={e => onTrackSelect(e.target.checked)}
                    />
                    <label htmlFor={`t-${track.index}`}>{track.name}</label>
                </div>
                <div className={`${styles['settings-item-control']}`}>
                    <button
                        type="button"
                        className={`button ${styles['icon-button']} button--sm ${isSolo ? 'button--success' : 'button--secondary button--outline'}`}
                        onClick={() => {
                            setSolo(v => !v);
                        }}
                        data-tooltip-content="Solo"
                        data-tooltip-id="tooltip-playground">
                        🎧
                    </button>
                    <button
                        type="button"
                        className={`button ${styles['icon-button']} button--sm ${isMute ? 'button--danger' : 'button--secondary button--outline'}`}
                        onClick={() => {
                            setMute(v => !v);
                        }}
                        data-tooltip-content="Mute"
                        data-tooltip-id="tooltip-playground">
                        🔇
                    </button>
                </div>
            </div>

            <div className={`${styles['settings-item']}`}>
                <div className={`${styles['settings-item-label']}`}>Volume</div>
                <div className={styles['settings-item-control']}>
                    <input
                        type="range"
                        min="0"
                        max="16"
                        defaultValue={volume}
                        onInput={e => setVolume((e.target as HTMLInputElement).valueAsNumber)}
                        onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    />
                </div>
            </div>

            <div className={`${styles['settings-item']}`}>
                <div
                    className={`${styles['settings-item-label']}`}
                    data-tooltip-content="Fully transposes the track (audio and notation)"
                    data-tooltip-id="tooltip-playground">
                    Transpose Full
                </div>
                <div className={styles['settings-item-control']}>
                    <input
                        type="range"
                        min="-12"
                        max="12"
                        step="1"
                        defaultValue={transposeFull}
                        onInput={e => setTransposeFull((e.target as HTMLInputElement).valueAsNumber)}
                        onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    />
                </div>
            </div>

            <div className={`${styles['settings-item']}`}>
                <div
                    className={`${styles['settings-item-label']}`}
                    data-tooltip-content="Transposes the audio playback of the track"
                    data-tooltip-id="tooltip-playground">
                    Transpose Audio
                </div>
                <div
                    className={styles['settings-item-control']}
                    data-tooltip-content={transposeAudio.toString()}
                    data-tooltip-id="tooltip-playground">
                    <input
                        type="range"
                        min="-12"
                        max="12"
                        step="1"
                        defaultValue={transposeAudio}
                        onInput={e => setTransposeAudio((e.target as HTMLInputElement).valueAsNumber)}
                        onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    />
                </div>
            </div>

            {track.staves.map(s => (
                <StaffItem api={api} staff={s} key={s.index} trackSettingsId={trackSettingsId} />
            ))}
        </div>
    );
};
