import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as solid from '@fortawesome/free-solid-svg-icons';
import * as brands from '@fortawesome/free-brands-svg-icons';
import styles from './styles.module.scss';

// Types for Google APIs
declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: {
                        client_id: string;
                        scope: string;
                        callback: (response: { access_token: string }) => void;
                    }) => {
                        requestAccessToken: () => void;
                    };
                };
            };
            picker: {
                PickerBuilder: new () => {
                    addView: (view: any) => any;
                    setOAuthToken: (token: string) => any;
                    setDeveloperKey: (key: string) => any;
                    setCallback: (callback: (data: any) => void) => any;
                    setEnableDrives?: (enable: boolean) => any;
                    build: () => { setVisible: (visible: boolean) => void };
                };

                DocsView: new (viewId?: string) => {
                    setIncludeFolders: (include: boolean) => any;
                    setSelectFolderEnabled: (enable: boolean) => any;
                };

                ViewId: {
                    FOLDERS: string;
                    DOCS: string;
                };

                Action: {
                    PICKED: string;
                    CANCEL: string;
                };
            };

        };
        gapi?: {
            load: (api: string, callback: () => void) => void;
        };
    }
}

interface GoogleDriveFile {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    size?: string;
}

interface GoogleDrivePickerProps {
    onFileSelect?: (file: GoogleDriveFile) => void;
    className?: string;
    children?: React.ReactNode;
}

export const GoogleDrivePicker: React.FC<GoogleDrivePickerProps> = ({ onFileSelect, className, children }) => {
    // Configuration - Замените эти значения на ваши реальные CLIENT_ID и API_KEY
    // Получите их из Google Cloud Console: https://console.cloud.google.com/apis/credentials
    const CLIENT_ID = '187570117608-0e63ipk7cnfpu2fk6sfn05o1k1j808ft.apps.googleusercontent.com';
    const API_KEY = 'AIzaSyC7AB-1sH0x1EfHRobIhELxATQVdtij5yc';
    const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

    // Supported Guitar Pro file extensions
    const SUPPORTED_EXTENSIONS = ['.gp', '.gp3', '.gp4', '.gp5', '.gpx', '.gp7', '.musicxml', '.xml', '.mxl', '.capx', '.ptb'];

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isScriptsLoaded, setIsScriptsLoaded] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
    const [files, setFiles] = useState<GoogleDriveFile[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [saveSelection, setSaveSelection] = useState(false);
    
    // Sort state
    const [sortField, setSortField] = useState<'name' | 'modifiedTime'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Load Google API scripts
    useEffect(() => {
        const loadScript = (src: string): Promise<void> => {
            return new Promise((resolve, reject) => {
                if (document.querySelector(`script[src="${src}"]`)) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.defer = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
                document.body.appendChild(script);
            });
        };

        Promise.all([
            loadScript('https://accounts.google.com/gsi/client'),
            loadScript('https://apis.google.com/js/api.js')
        ])
            .then(() => {
                setIsScriptsLoaded(true);
            })
            .catch(error => {
                console.error('Error loading Google API scripts:', error);
            });
    }, []);

    // Check for existing token in localStorage
    useEffect(() => {
        const savedToken = localStorage.getItem('google_drive_access_token');
        const savedFolderId = localStorage.getItem('google_drive_folder_id');
        const savedFolderName = localStorage.getItem('google_drive_folder_name');
        
        if (savedToken) {
            setAccessToken(savedToken);
            setIsAuthenticated(true);
        }
        
        if (savedFolderId && savedFolderName) {
            setSelectedFolder(savedFolderId);
            setSelectedFolderName(savedFolderName);
        }

        const savedSaveSelection = localStorage.getItem('google_drive_save_selection');
        if (savedSaveSelection === 'true') {
            setSaveSelection(true);
        }
    }, []);

    // Handle Google Sign-In
    const handleSignIn = () => {
        if (!isScriptsLoaded || !window.google) {
            console.error('Google API scripts not loaded');
            return;
        }

        const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response) => {
                if (response.access_token) {
                    setAccessToken(response.access_token);
                    setIsAuthenticated(true);
                    localStorage.setItem('google_drive_access_token', response.access_token);
                }
            }
        });

        tokenClient.requestAccessToken();
    };

    // Handle Sign Out
    const handleSignOut = () => {
        setAccessToken(null);
        setIsAuthenticated(false);
        setSelectedFolder(null);
        setSelectedFolderName(null);
        setFiles([]);
        localStorage.removeItem('google_drive_access_token');
        localStorage.removeItem('google_drive_folder_id');
        localStorage.removeItem('google_drive_folder_name');
        localStorage.removeItem('google_drive_last_file');
        setIsModalOpen(false);
    };

    // Open Google Picker to select a folder
    const openFolderPicker = () => {
        if (!accessToken || !window.google || !window.gapi) {
            console.error('Not authenticated or Google API not loaded');
            return;
        }

        // Hide our modal while Picker is open
        setIsPickerOpen(true);

        window.gapi.load('picker', () => {
            if (!window.google) return;

            const view = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
                .setIncludeFolders(true)          // показывать папки
                .setSelectFolderEnabled(true);    // РАЗРЕШИТЬ выбор папки

            const picker = new window.google.picker.PickerBuilder()
                .addView(view)
                .setOAuthToken(accessToken)
                .setDeveloperKey(API_KEY)
                .setCallback(pickerCallback)
                .build();

            picker.setVisible(true);
            });

    };

    // Handle picker selection
    const pickerCallback = (data: any) => {
        // Check if picker was closed or cancelled
        if (data.action === window.google?.picker.Action.CANCEL) {
            // Show our modal again when Picker is cancelled/closed
            setIsPickerOpen(false);
            return;
        }

        if (data.action === window.google?.picker.Action.PICKED) {
            const folderId = data.docs[0].id;
            const folderName = data.docs[0].name;
            
            setSelectedFolder(folderId);
            setSelectedFolderName(folderName);
            
            // Save to localStorage
            localStorage.setItem('google_drive_folder_id', folderId);
            localStorage.setItem('google_drive_folder_name', folderName);
            
            loadFilesFromFolder(folderId);
            // Show our modal again after selection
            setIsPickerOpen(false);
        }
    };

    // Check if file is supported
    const isSupportedFile = (fileName: string): boolean => {
        const lowerName = fileName.toLowerCase();
        return SUPPORTED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
    };

    // Get file icon based on extension
    const getFileIcon = (fileName: string, mimeType: string) => {
        if (mimeType.includes('folder')) {
            return solid.faFolder;
        }
        const lowerName = fileName.toLowerCase();
        if (lowerName.endsWith('.gp') || lowerName.endsWith('.gp3') || lowerName.endsWith('.gp4') ||
            lowerName.endsWith('.gp5') || lowerName.endsWith('.gpx') || lowerName.endsWith('.gp7')) {
            return solid.faFileAudio;
        }
        if (lowerName.endsWith('.xml') || lowerName.endsWith('.musicxml') || lowerName.endsWith('.mxl')) {
            return solid.faFileCode;
        }
        return solid.faFile;
    };

    // Load files from selected folder
    const loadFilesFromFolder = async (folderId: string) => {
        if (!accessToken) return;

        setIsLoadingFiles(true);
        try {
            const query = `'${folderId}' in parents and trashed=false`;
            const fields = 'files(id,name,mimeType,modifiedTime,size)';
            const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${fields}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load files');
            }

            const data = await response.json();
            // Filter only supported files
            const allFiles = data.files || [];
            const supportedFiles = allFiles.filter((file: GoogleDriveFile) => 
                !file.mimeType.includes('folder') && isSupportedFile(file.name)
            );
            setFiles(supportedFiles);
        } catch (error) {
            console.error('Error loading files:', error);
            // Token might be expired
            if (error instanceof Error && error.message.includes('401')) {
                handleSignOut();
            }
        } finally {
            setIsLoadingFiles(false);
        }
    };

    // Handle file selection from list
    const handleFileClick = (file: GoogleDriveFile) => {
        // Skip folders
        if (file.mimeType.includes('folder')) {
            return;
        }

        if (onFileSelect) {
            onFileSelect(file);
            // Close modal after selection
            setIsModalOpen(false);
        }
        console.log('Selected file:', file);
    };

    useEffect(() => {
        if (isModalOpen && selectedFolder && accessToken && !isPickerOpen) {
            loadFilesFromFolder(selectedFolder);
        }
    }, [isModalOpen]);

    // Derived sorted files
    const sortedFiles = useMemo(() => {
        return [...files].sort((a, b) => {
            let comparison = 0;
            if (sortField === 'name') {
                comparison = a.name.localeCompare(b.name);
            } else if (sortField === 'modifiedTime') {
                comparison = new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime();
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [files, sortField, sortOrder]);

    const toggleSort = (field: 'name' | 'modifiedTime') => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };



    // Format file size
    const formatFileSize = (bytes?: string) => {
        if (!bytes) return 'N/A';
        const size = parseInt(bytes);
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    };

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    return (
        <>
            {!isAuthenticated ? (
                <button
                    type="button"
                    onClick={handleSignIn}
                    disabled={!isScriptsLoaded}
                    data-tooltip-id="tooltip-playground"
                    data-tooltip-content="Sign in with Google Drive"
                    className={className || styles['google-drive-button']}>
                    <FontAwesomeIcon icon={brands.faGoogleDrive} />
                    {children}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    data-tooltip-id="tooltip-playground"
                    data-tooltip-content="Open Google Drive"
                    className={className || styles['google-drive-button']}>
                    <FontAwesomeIcon icon={brands.faGoogleDrive} style={{ color: '#4285f4' }} />
                    {children}
                </button>
            )}

            {isModalOpen && !isPickerOpen && (
                <div className={styles['modal-overlay']} onClick={() => setIsModalOpen(false)}>
                    <div className={styles['modal-content']} onClick={e => e.stopPropagation()}>
                        <div className={styles['modal-header']}>
                            <div className={styles['modal-header-left']}>
                                <h2>Google Drive</h2>
                                {selectedFolder && selectedFolderName && (
                                    <div className={styles['modal-folder-info']}>
                                        <FontAwesomeIcon icon={solid.faFolder} />
                                        <span>{selectedFolderName}</span>
                                    </div>
                                )}
                                <label className={styles['save-selection-checkbox']}>
                                    <input 
                                        type="checkbox" 
                                        checked={saveSelection} 
                                        onChange={(e) => {
                                            setSaveSelection(e.target.checked);
                                            localStorage.setItem('google_drive_save_selection', e.target.checked.toString());
                                            if (!e.target.checked) {
                                                localStorage.removeItem('google_drive_last_file');
                                            }
                                        }} 
                                    />
                                    <span>Save Selection</span>
                                </label>
                            </div>
                            <div className={styles['modal-header-right']}>
                                {selectedFolder && (
                                    <button
                                        type="button"
                                        onClick={openFolderPicker}
                                        className={styles['modal-change-folder-btn']}
                                        title="Change Folder">
                                        <FontAwesomeIcon icon={solid.faFolderOpen} />
                                    </button>
                                )}
                                <button 
                                    type="button" 
                                    onClick={handleSignOut} 
                                    className={styles['modal-sign-out-btn']}
                                    title="Sign Out">
                                    <FontAwesomeIcon icon={solid.faSignOutAlt} />
                                </button>
                                <button
                                    type="button"
                                    className={styles['modal-close']}
                                    onClick={() => setIsModalOpen(false)}>
                                    <FontAwesomeIcon icon={solid.faTimes} />
                                </button>
                            </div>
                        </div>

                        <div className={styles['modal-body']}>
                            {!selectedFolder ? (
                                <div className={styles['folder-selector']}>
                                    <p>Select a folder to view files</p>
                                    <button
                                        type="button"
                                        onClick={openFolderPicker}
                                        className={styles['select-folder-btn']}>
                                        <FontAwesomeIcon icon={solid.faFolder} /> Select Folder
                                    </button>
                                </div>
                            ) : (
                                <div className={styles['files-container']}>
                                    {isLoadingFiles ? (
                                        <div className={styles['loading']}>
                                            <FontAwesomeIcon icon={solid.faSpinner} spin /> Loading files...
                                        </div>
                                    ) : files.length === 0 ? (
                                        <div className={styles['no-files']}>
                                            <p>No supported files found in this folder</p>
                                            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                                Supported formats: {SUPPORTED_EXTENSIONS.join(', ')}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={styles['sort-bar']}>
                                                <button 
                                                    className={`${styles['sort-btn']} ${sortField === 'name' ? styles['active'] : ''}`}
                                                    onClick={() => toggleSort('name')}>
                                                    Name {sortField === 'name' && (
                                                        <FontAwesomeIcon icon={sortOrder === 'asc' ? solid.faSortUp : solid.faSortDown} />
                                                    )}
                                                </button>
                                                <button 
                                                    className={`${styles['sort-btn']} ${sortField === 'modifiedTime' ? styles['active'] : ''}`}
                                                    onClick={() => toggleSort('modifiedTime')}>
                                                    Date {sortField === 'modifiedTime' && (
                                                        <FontAwesomeIcon icon={sortOrder === 'asc' ? solid.faSortUp : solid.faSortDown} />
                                                    )}
                                                </button>
                                            </div>
                                            <div className={styles['files-list']}>
                                                {sortedFiles.map(file => (
                                                    <div
                                                        key={file.id}
                                                        className={styles['file-item']}
                                                        onClick={() => handleFileClick(file)}>
                                                        <div className={styles['file-icon']}>
                                                            <FontAwesomeIcon
                                                                icon={getFileIcon(file.name, file.mimeType)}
                                                            />
                                                        </div>
                                                        <div className={styles['file-main-info']}>
                                                            <div className={styles['file-name']}>{file.name}</div>
                                                            <div className={styles['file-size']}>
                                                                {formatFileSize(file.size)}
                                                            </div>
                                                        </div>
                                                        <div className={styles['file-date']}>
                                                            {formatDate(file.modifiedTime)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer removed as Sign Out is now in Header */}
                    </div>
                </div>
            )}
        </>
    );
};
