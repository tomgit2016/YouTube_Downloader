# YouTube Downloader

A standalone macOS desktop application for downloading YouTube videos with authentication support, quality selection, and bot detection avoidance.

## Features

- **Simple URL Input**: Paste a YouTube URL to download videos
- **Quality Selection**: Choose from available video qualities (default: best available)
- **Subtitle Options**: Download subtitles in multiple formats (SRT, VTT, ASS)
- **YouTube Authentication**: Support for authenticated downloads via cookies
- **Bot Detection Avoidance**: Realistic headers, rate limiting, and cookie management
- **Download Progress**: Real-time progress tracking with speed and ETA
- **Recent Downloads**: View and manage your download history
- **Context Menu**: Right-click for Open, Open With (with app icons), Show in Finder, Delete
- **Save Location Picker**: Native macOS folder picker

## Prerequisites

1. **Bun** (JavaScript runtime)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Rust** (for Tauri)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
   source "$HOME/.cargo/env"
   ```

3. **yt-dlp** (YouTube downloader)
   ```bash
   brew install yt-dlp
   ```

4. **ffmpeg** (for merging video and audio streams)
   ```bash
   brew install ffmpeg
   ```

5. **YouTube Cookies** (for authentication)
   
   YouTube requires authentication to avoid bot detection. Export your cookies once:
   ```bash
   mkdir -p ~/.youtube-downloader
   yt-dlp --cookies-from-browser chrome --cookies ~/.youtube-downloader/cookies.txt --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
   ```
   
   This creates a cookies file that the app will use for all downloads.

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd youtube_downloader
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

## Development

### Start Development Server (with hot reload)

```bash
cargo tauri dev
```

This will start:
- Vite dev server with hot module replacement
- Tauri development window with DevTools (Cmd+Option+I)

Frontend changes (React/CSS) will hot reload instantly. Rust backend changes will trigger an automatic rebuild.

### Run TypeScript Check

```bash
npx tsc --noEmit
```

### Run Linting

```bash
bun run lint
```

## Building for Production

### Build Release DMG

```bash
cargo tauri build
```

Build outputs:
- **macOS App**: `target/release/bundle/macos/YouTube Downloader.app`
- **DMG Installer**: `target/release/bundle/dmg/YouTube Downloader_0.1.0_aarch64.dmg`

### Build Debug Version (faster, for testing)

```bash
cargo tauri build --debug
```

Build outputs:
- **macOS App**: `target/debug/bundle/macos/YouTube Downloader.app`
- **DMG Installer**: `target/debug/bundle/dmg/YouTube Downloader_0.1.0_aarch64.dmg`

### Installing the App

1. Open the DMG file
2. Drag "YouTube Downloader" to the Applications folder
3. First launch: Right-click the app → Open (to bypass Gatekeeper since it's unsigned)

## Usage

1. **Paste YouTube URL**: Enter a valid YouTube URL in the input field
2. **Select Quality**: Choose your preferred video quality (defaults to best available)
3. **Configure Subtitles**: English subtitles are enabled by default
4. **Choose Save Location**: Click Browse to select download folder
5. **Download**: Click the Download button to start
6. **Manage Downloads**: 
   - Double-click to open video
   - Right-click for context menu (Open With, Show in Finder, Delete, etc.)

## Project Structure

```
youtube_downloader/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # React components
│   │   ├── URLInput.tsx
│   │   ├── QualitySelector.tsx
│   │   ├── SubtitleOptions.tsx
│   │   ├── SaveLocationPicker.tsx
│   │   ├── DownloadProgress.tsx
│   │   └── RecentDownloads.tsx
│   ├── stores/             # Zustand state management
│   │   └── app-store.ts
│   ├── types/              # TypeScript types
│   ├── utils/              # Utility functions
│   ├── App.tsx             # Main app component
│   ├── App.css             # Styles
│   └── main.tsx            # Entry point
├── src-tauri/              # Backend (Rust + Tauri)
│   ├── src/
│   │   ├── main.rs         # Tauri entry point
│   │   └── commands.rs     # Tauri commands (yt-dlp integration)
│   ├── capabilities/       # Tauri permissions
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── target/                 # Build outputs (gitignored)
│   ├── debug/bundle/       # Debug builds
│   └── release/bundle/     # Release builds
└── package.json            # Node dependencies
```

## Technology Stack

- **Desktop Framework**: Tauri 2.x (Rust)
- **Frontend**: React 19 + TypeScript + Vite
- **State Management**: Zustand
- **YouTube Backend**: yt-dlp
- **Package Manager**: Bun

## Troubleshooting

### "Sign in to confirm you're not a bot" error
Re-export your YouTube cookies:
```bash
yt-dlp --cookies-from-browser chrome --cookies ~/.youtube-downloader/cookies.txt --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

### yt-dlp not found
Install via Homebrew:
```bash
brew install yt-dlp
```

### ffmpeg not found (video and audio not merged)
Install via Homebrew:
```bash
brew install ffmpeg
```

### App won't open (macOS Gatekeeper)
Right-click the app → Open → Open (in the dialog)

## License

MIT
