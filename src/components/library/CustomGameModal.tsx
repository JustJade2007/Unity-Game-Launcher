import React, { useState, useEffect } from 'react';
import { Game } from '../../types/game';
import { useLibrary } from '../../context/LibraryContext';
import {
  X,
  FolderOpen,
  FileCode,
  Sparkles,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Gamepad2,
  Search,
  Plus,
} from 'lucide-react';

interface CustomGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGame?: Game | null;
}

type ModalTab = 'form' | 'scanner';

export const CustomGameModal: React.FC<CustomGameModalProps> = ({
  isOpen,
  onClose,
  editingGame,
}) => {
  const { addGame, updateGame, deleteGame, toggleHideGame, rescanGame } = useLibrary();

  const isEditing = Boolean(editingGame);

  const [activeTab, setActiveTab] = useState<ModalTab>('form');
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [developer, setDeveloper] = useState('');
  const [publisher, setPublisher] = useState('');
  const [categoriesText, setCategoriesText] = useState('Custom, Action');
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [executablePath, setExecutablePath] = useState('');
  const [launchArguments, setLaunchArguments] = useState('');
  const [workingDirectory, setWorkingDirectory] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [heroUrl, setHeroUrl] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [sizeGb, setSizeGb] = useState<number>(0);

  // Status & feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [isSearchingSteamDB, setIsSearchingSteamDB] = useState(false);

  // Directory Scanner State
  const [scannedDir, setScannedDir] = useState('');
  const [isScanningDir, setIsScanningDir] = useState(false);
  const [scannedCandidates, setScannedCandidates] = useState<
    Array<{
      title: string;
      fileName: string;
      executablePath: string;
      workingDirectory: string;
      sizeGb: number;
      iconDataUrl?: string;
      sourceDirectory?: string;
    }>
  >([]);

  // Initialize or reset form when modal opens or editingGame changes
  useEffect(() => {
    if (editingGame) {
      setTitle(editingGame.title || '');
      setTagline(editingGame.tagline || '');
      setDescription(editingGame.description || '');
      setDeveloper(editingGame.developer || '');
      setPublisher(editingGame.publisher || '');
      setCategoriesText(editingGame.categories ? editingGame.categories.join(', ') : 'Custom');
      setReleaseDate(editingGame.releaseDate || new Date().toISOString().split('T')[0]);
      setExecutablePath(editingGame.executablePath || editingGame.installPath || '');
      setLaunchArguments(editingGame.launchArguments || '');
      setWorkingDirectory(editingGame.workingDirectory || '');
      setCoverUrl(editingGame.media?.coverUrl || '');
      setHeroUrl(editingGame.media?.heroUrl || '');
      setIconUrl(editingGame.media?.iconUrl || '');
      setSizeGb(editingGame.sizeGb || 0);
      setActiveTab('form');
    } else {
      setTitle('');
      setTagline('');
      setDescription('');
      setDeveloper('');
      setPublisher('');
      setCategoriesText('Custom, Action');
      setReleaseDate(new Date().toISOString().split('T')[0]);
      setExecutablePath('');
      setLaunchArguments('');
      setWorkingDirectory('');
      setCoverUrl('');
      setHeroUrl('');
      setIconUrl('');
      setSizeGb(0);
      setActiveTab('form');
      setScannedCandidates([]);
      setScannedDir('');
    }
    setStatusMessage(null);
  }, [editingGame, isOpen]);

  if (!isOpen) return null;

  const handleBrowseExecutable = async () => {
    if (!window.electronAPI?.selectExecutable) return;
    setStatusMessage(null);
    try {
      const selected = await window.electronAPI.selectExecutable();
      if (selected) {
        setExecutablePath(selected);
        // Automatically default working directory to the folder containing the binary
        const parentDir = selected.substring(0, Math.max(selected.lastIndexOf('\\'), selected.lastIndexOf('/')));
        if (parentDir) setWorkingDirectory(parentDir);

        // Automatically inspect binary metadata & query SteamDB fallback
        if (window.electronAPI?.parseCustomGame) {
          setIsParsing(true);
          setStatusMessage({ type: 'info', text: 'Inspecting binary headers, extracting icon, and searching SteamDB...' });
          const res = await window.electronAPI.parseCustomGame(selected);
          setIsParsing(false);
          if (res.success && res.metadata) {
            const meta = res.metadata;
            if (meta.title && (!title || !isEditing)) setTitle(meta.title);
            if (meta.developer && (!developer || !isEditing)) setDeveloper(meta.developer);
            if (meta.publisher && (!publisher || !isEditing)) setPublisher(meta.publisher);
            if (meta.description && (!description || !isEditing)) setDescription(meta.description);
            if (meta.sizeGb) setSizeGb(meta.sizeGb);
            if (meta.workingDirectory && !workingDirectory) setWorkingDirectory(meta.workingDirectory);
            if (meta.media?.coverUrl) setCoverUrl(meta.media.coverUrl);
            if (meta.media?.heroUrl) setHeroUrl(meta.media.heroUrl);
            if (meta.media?.iconUrl) setIconUrl(meta.media.iconUrl);
            if (meta.categories && meta.categories.length > 0 && !isEditing) {
              setCategoriesText(meta.categories.join(', '));
            }
            setStatusMessage({
              type: 'success',
              text: `Metadata inspected successfully! Inferred: "${meta.title}" (${meta.sizeGb || 0} GB).`,
            });
          } else {
            setStatusMessage({
              type: 'info',
              text: 'Executable selected. You can now customize title and parameters.',
            });
          }
        }
      }
    } catch (err: unknown) {
      setIsParsing(false);
      const msg = err instanceof Error ? err.message : 'Failed to select executable';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  const handleBrowseDirectory = async () => {
    if (!window.electronAPI?.selectDirectory) return;
    try {
      const selected = await window.electronAPI.selectDirectory();
      if (selected) {
        setWorkingDirectory(selected);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to select directory';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  const handleScanDirectory = async () => {
    if (!window.electronAPI?.selectDirectory || !window.electronAPI?.scanDirectoryForGames) return;
    setStatusMessage(null);
    try {
      const selectedDir = await window.electronAPI.selectDirectory();
      if (!selectedDir) return;

      setScannedDir(selectedDir);
      setIsScanningDir(true);
      setStatusMessage({ type: 'info', text: `Scanning "${selectedDir}" for game binaries...` });

      const res = await window.electronAPI.scanDirectoryForGames(selectedDir);
      setIsScanningDir(false);

      if (res.success && Array.isArray(res.games)) {
        setScannedCandidates(res.games);
        setStatusMessage({
          type: res.games.length > 0 ? 'success' : 'info',
          text: `Found ${res.games.length} executable candidate${res.games.length === 1 ? '' : 's'} in directory.`,
        });
      } else {
        setScannedCandidates([]);
        setStatusMessage({ type: 'error', text: res.error || 'No compatible game executables detected.' });
      }
    } catch (err: unknown) {
      setIsScanningDir(false);
      const msg = err instanceof Error ? err.message : 'Error scanning directory';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  const handleSelectCandidate = async (candidate: {
    title: string;
    executablePath: string;
    workingDirectory: string;
    sizeGb: number;
    iconDataUrl?: string;
  }) => {
    setTitle(candidate.title);
    setExecutablePath(candidate.executablePath);
    setWorkingDirectory(candidate.workingDirectory);
    setSizeGb(candidate.sizeGb);
    if (candidate.iconDataUrl) {
      setIconUrl(candidate.iconDataUrl);
      setCoverUrl(candidate.iconDataUrl);
    }
    setActiveTab('form');

    // Parse further with SteamDB lookup
    if (window.electronAPI?.parseCustomGame) {
      setIsParsing(true);
      try {
        const res = await window.electronAPI.parseCustomGame(candidate.executablePath);
        if (res.success && res.metadata) {
          const meta = res.metadata;
          if (meta.title) setTitle(meta.title);
          if (meta.developer) setDeveloper(meta.developer);
          if (meta.publisher) setPublisher(meta.publisher);
          if (meta.description) setDescription(meta.description);
          if (meta.media?.coverUrl) setCoverUrl(meta.media.coverUrl);
          if (meta.media?.heroUrl) setHeroUrl(meta.media.heroUrl);
          if (meta.categories && meta.categories.length > 0) setCategoriesText(meta.categories.join(', '));
          setStatusMessage({ type: 'success', text: `Loaded details for "${candidate.title}".` });
        }
      } catch {}
      setIsParsing(false);
    }
  };

  const handleRescanCurrent = async () => {
    if (!editingGame) return;
    setIsRescanning(true);
    setStatusMessage({ type: 'info', text: 'Rescanning executable on disk...' });
    try {
      const res = await rescanGame(editingGame.id);
      setIsRescanning(false);
      if (res.success && res.game) {
        setSizeGb(res.game.sizeGb || sizeGb);
        setStatusMessage({ type: 'success', text: `Rescan complete: verified on disk (${res.game.sizeGb || 0} GB).` });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to verify binary on disk.' });
      }
    } catch (err: unknown) {
      setIsRescanning(false);
      const msg = err instanceof Error ? err.message : 'Rescan error';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  const handleSearchSteamDB = async () => {
    if (!title.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a game title before searching SteamDB.' });
      return;
    }
    setIsSearchingSteamDB(true);
    setStatusMessage({ type: 'info', text: `Searching SteamDB for "${title}"...` });
    try {
      // Use parseCustomGame or enrichGameMedia logic via title heuristic
      if (window.electronAPI?.parseCustomGame && executablePath) {
        const res = await window.electronAPI.parseCustomGame(executablePath);
        if (res.success && res.metadata?.media) {
          if (res.metadata.media.coverUrl) setCoverUrl(res.metadata.media.coverUrl);
          if (res.metadata.media.heroUrl) setHeroUrl(res.metadata.media.heroUrl);
          if (res.metadata.description && !description) setDescription(res.metadata.description);
          if (res.metadata.developer && !developer) setDeveloper(res.metadata.developer);
          setStatusMessage({ type: 'success', text: 'Fetched SteamDB cover art and description!' });
          setIsSearchingSteamDB(false);
          return;
        }
      }
      setStatusMessage({ type: 'info', text: 'Search completed. You can also paste direct cover URLs below.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error searching SteamDB';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSearchingSteamDB(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setStatusMessage({ type: 'error', text: 'Game title is required.' });
      return;
    }

    if (!executablePath.trim()) {
      setStatusMessage({ type: 'error', text: 'Executable path is required to launch local games.' });
      return;
    }

    const categories = categoriesText
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    if (!categories.includes('Custom')) categories.unshift('Custom');

    const gameId = editingGame ? editingGame.id : `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const customGame: Game = {
      id: gameId,
      title: title.trim(),
      tagline: tagline.trim() || `${title} (Local Game)`,
      description: description.trim() || `Custom standalone game entry configured by user.`,
      developer: developer.trim() || 'Independent',
      publisher: publisher.trim() || 'Custom',
      releaseDate: releaseDate.trim() || new Date().toISOString().split('T')[0],
      categories,
      launcher: 'Local',
      installed: true,
      installPath: workingDirectory.trim() || undefined,
      executablePath: executablePath.trim(),
      launchArguments: launchArguments.trim() || undefined,
      workingDirectory: workingDirectory.trim() || undefined,
      sizeGb: sizeGb > 0 ? sizeGb : undefined,
      isCustom: true,
      hidden: editingGame ? Boolean(editingGame.hidden) : false,
      favorite: editingGame ? Boolean(editingGame.favorite) : false,
      playtime: editingGame?.playtime || { totalMinutes: 0 },
      media: {
        coverUrl: coverUrl.trim() || heroUrl.trim() || iconUrl || '',
        heroUrl: heroUrl.trim() || '',
        iconUrl: iconUrl.trim() || undefined,
        screenshots: editingGame?.media?.screenshots || [],
      },
      achievements: editingGame?.achievements || [],
      friends: editingGame?.friends || [],
      ownershipSources: [
        {
          launcher: 'Local',
          gameId,
          installed: true,
          installPath: workingDirectory.trim() || undefined,
        },
      ],
    };

    if (isEditing) {
      updateGame(customGame);
    } else {
      addGame(customGame);
    }

    onClose();
  };

  const handleDelete = async () => {
    if (!editingGame) return;
    const confirmed = window.confirm(`Are you sure you want to permanently delete "${editingGame.title}" from your library?`);
    if (confirmed) {
      await deleteGame(editingGame.id);
      onClose();
    }
  };

  const handleToggleHide = () => {
    if (!editingGame) return;
    toggleHideGame(editingGame.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e1017] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#121420]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                {isEditing ? `Edit "${editingGame?.title}"` : 'Add Custom Game'}
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Local Title
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                {isEditing
                  ? 'Update executable paths, launch parameters, or metadata'
                  : 'Import standalone executables or scan local directories'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Only when adding new game) */}
        {!isEditing && (
          <div className="flex border-b border-white/5 bg-[#090b10] px-6 pt-2">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'form'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Manual Entry & Browse .EXE</span>
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'scanner'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Directory Scanner</span>
            </button>
          </div>
        )}

        {/* Status / Alert Banner */}
        {statusMessage && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2.5 border ${
              statusMessage.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                : statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
            }`}
          >
            {statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 flex-shrink-0 animate-spin" />
            )}
            <span className="flex-1">{statusMessage.text}</span>
          </div>
        )}

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {activeTab === 'scanner' ? (
            /* Directory Scanner Tab */
            <div className="space-y-4">
              <div className="bg-[#141622] p-4 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Scan Folder for Game Executables</h3>
                    <p className="text-xs text-gray-400">
                      Select a directory (e.g. C:\Games, D:\ItchGames) to automatically detect installed binaries.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleScanDirectory}
                    disabled={isScanningDir}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>{isScanningDir ? 'Scanning...' : 'Select Folder to Scan'}</span>
                  </button>
                </div>

                {scannedDir && (
                  <div className="text-[11px] font-mono text-gray-400 bg-black/40 px-3 py-1.5 rounded-lg truncate">
                    Scanning: {scannedDir}
                  </div>
                )}
              </div>

              {/* Detected candidates list */}
              {scannedCandidates.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Detected Executables ({scannedCandidates.length})
                  </h4>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {scannedCandidates.map((cand) => (
                      <div
                        key={cand.executablePath}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#141620] hover:bg-[#1a1d2c] border border-white/5 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {cand.iconDataUrl ? (
                            <img src={cand.iconDataUrl} alt="" className="w-8 h-8 rounded-lg object-contain bg-black/40 p-1" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                              <Gamepad2 className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h5 className="text-xs font-semibold text-white truncate">{cand.title}</h5>
                            <p className="text-[10px] text-gray-400 font-mono truncate">{cand.executablePath}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-[10px] text-gray-400">{cand.sizeGb} GB</span>
                          <button
                            type="button"
                            onClick={() => handleSelectCandidate(cand)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-medium border border-indigo-500/40 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Select & Configure</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !isScanningDir && scannedDir ? (
                <div className="text-center py-8 text-gray-400 text-xs bg-[#121420] rounded-xl border border-white/5">
                  No compatible standalone game binaries were discovered in this folder.
                </div>
              ) : null}
            </div>
          ) : (
            /* Manual Entry Form */
            <form id="customGameForm" onSubmit={handleSave} className="space-y-4">
              {/* Executable Path Section */}
              <div className="bg-[#141622] p-4 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Executable Path (.exe / .bat) *</span>
                  </label>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleRescanCurrent}
                      disabled={isRescanning}
                      className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRescanning ? 'animate-spin' : ''}`} />
                      <span>Rescan Executable</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={executablePath}
                    onChange={(e) => setExecutablePath(e.target.value)}
                    placeholder="C:\Games\ExampleGame\ExampleGame.exe"
                    className="flex-1 bg-[#0c0e15] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleBrowseExecutable}
                    disabled={isParsing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{isParsing ? 'Inspecting...' : 'Browse...'}</span>
                  </button>
                </div>

                {/* Technical Launch Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">
                      Working Directory
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={workingDirectory}
                        onChange={(e) => setWorkingDirectory(e.target.value)}
                        placeholder="Default is executable folder"
                        className="flex-1 bg-[#0c0e15] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleBrowseDirectory}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs border border-white/10"
                        title="Browse directory"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">
                      Launch Arguments
                    </label>
                    <input
                      type="text"
                      value={launchArguments}
                      onChange={(e) => setLaunchArguments(e.target.value)}
                      placeholder="-windowed -novid --fullscreen"
                      className="w-full bg-[#0c0e15] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* General Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-300">Game Title *</label>
                    <button
                      type="button"
                      onClick={handleSearchSteamDB}
                      disabled={isSearchingSteamDB || !title.trim()}
                      className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 disabled:opacity-40"
                    >
                      <Search className="w-3 h-3" />
                      <span>{isSearchingSteamDB ? 'Searching...' : 'Search SteamDB Artwork'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Celeste"
                    className="w-full bg-[#141620] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Tagline / Short Hook</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. A gripping narrative platformer"
                    className="w-full bg-[#141620] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Developer</label>
                  <input
                    type="text"
                    value={developer}
                    onChange={(e) => setDeveloper(e.target.value)}
                    placeholder="e.g. Maddy Makes Games"
                    className="w-full bg-[#141620] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Publisher</label>
                  <input
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="e.g. Self-Published"
                    className="w-full bg-[#141620] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Categories / Genres</label>
                  <input
                    type="text"
                    value={categoriesText}
                    onChange={(e) => setCategoriesText(e.target.value)}
                    placeholder="Custom, Action, Indie, Platformer"
                    className="w-full bg-[#141620] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Release Date</label>
                  <input
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="w-full bg-[#141620] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Game overview and storyline..."
                  className="w-full bg-[#141620] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Artwork URLs & Previews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300">Cover Art URL (Poster 2:3)</label>
                  <input
                    type="text"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://... or base64 icon data URL"
                    className="w-full bg-[#141620] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-indigo-500 truncate"
                  />
                  {coverUrl && (
                    <div className="w-20 h-28 rounded-lg overflow-hidden border border-white/10 bg-black/40">
                      <img src={coverUrl} alt="Cover preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300">Hero Backdrop URL (16:9)</label>
                  <input
                    type="text"
                    value={heroUrl}
                    onChange={(e) => setHeroUrl(e.target.value)}
                    placeholder="https://... cinematic wide image"
                    className="w-full bg-[#141620] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-indigo-500 truncate"
                  />
                  {heroUrl && (
                    <div className="w-full h-28 rounded-lg overflow-hidden border border-white/10 bg-black/40">
                      <img src={heroUrl} alt="Hero preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#121420]/90 flex items-center justify-between">
          <div>
            {isEditing && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleHide}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs border border-white/10 transition-colors"
                >
                  {editingGame?.hidden ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{editingGame?.hidden ? 'Unhide Game' : 'Hide Game'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs border border-rose-500/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            {activeTab === 'form' && (
              <button
                type="submit"
                form="customGameForm"
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Save Changes' : 'Add to Library'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
