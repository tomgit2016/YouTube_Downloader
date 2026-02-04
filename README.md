# YouTube Downloader

A standalone macOS desktop application for downloading YouTube videos with authentication support, quality selection, and bot detection avoidance.

## Features

- **Simple URL Input**: Paste a YouTube URL to download videos
- **Quality Selection**: Choose from available video qualities (default: best available)
- **Subtitle Options**: Download subtitles in multiple formats (SRT, VTT, ASS)
- **YouTube Authentication**: Support for authenticated downloads via OAuth 2.0
- **Bot Detection Avoidance**: Realistic headers, rate limiting, and cookie management
- **Download Progress**: Real-time progress tracking with speed and ETA
- **Recent Downloads**: View and manage your download history
- **Double-click to Open**: Open downloaded videos directly from the app
- **Save Location Picker**: Choose where to save your downloads

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

**Note**: The app requires yt-dlp to be installed on your system. The app will search for yt-dlp in common locations:
- `/opt/homebrew/bin/yt-dlp` (Homebrew on Apple Silicon)
- `/usr/local/bin/yt-dlp` (Homebrew on Intel)
- `/usr/bin/yt-dlp` (System PATH)

If yt-dlp is not found, you will see an error message with installation instructions.

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

3. Build the Tauri app:
    ```bash
    source "$HOME/.cargo/env"
    cargo tauri build
    ```

## Development

### Start Development Server

```bash
source "$HOME/.cargo/env"
cargo tauri dev
```

This will start:
- Vite dev server on `http://localhost:5173`
- Tauri development window

### Build for Production

```bash
source "$HOME/.cargo/env"
cargo tauri build
```

The built app will be in `target/release/bundle/`:
- **macOS App**: `target/release/bundle/macos/YouTube Downloader.app`
- **DMG Installer**: `target/release/bundle/dmg/YouTube Downloader_0.1.0_aarch64.dmg`

## Usage

1. **Paste YouTube URL**: Enter a valid YouTube URL in the input field
2. **Select Quality**: Choose your preferred video quality from the dropdown
3. **Configure Subtitles**: Optionally enable subtitle download and select languages
4. **Choose Save Location**: Browse to select where to save the file
5. **Download**: Click the Download button to start the download
6. **View Recent Downloads**: Access your download history from the sidebar
7. **Open Videos**: Double-click any recent download to open in your default video player

## Project Structure

```
youtube_downloader/
├── src/
│   ├── components/          # React components
│   │   ├── URLInput.tsx
│   │   ├── QualitySelector.tsx
│   │   ├── SubtitleOptions.tsx
│   │   ├── SaveLocationPicker.tsx
│   │   ├── DownloadProgress.tsx
│   │   └── RecentDownloads.tsx
│   ├── services/           # Backend services
│   │   ├── ytdlp.ts
│   │   └── recent-downloads.ts
│   ├── stores/             # Zustand stores
│   │   └── app-store.ts
│   ├── types/              # TypeScript types
│   │   └── index.ts
│   ├── utils/              # Utility functions
│   │   ├── validation.ts
│   │   └── formatting.ts
│   ├── App.tsx             # Main app component
│   ├── App.css              # App styles
│   └── main.tsx            # Entry point
├── src-tauri/              # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs         # Tauri entry point
│   │   └── commands.rs     # Tauri commands
│   ├── Cargo.toml
│   └── tauri.conf.json     # Tauri configuration
├── plans/                 # Architecture documentation
│   └── architecture.md
└── package.json
```

## Technology Stack

- **Runtime**: Bun
- **Desktop Framework**: Tauri 2.x
- **Frontend Framework**: React 19 + Vite
- **State Management**: Zustand
- **YouTube Downloader**: yt-dlp
- **Language**: TypeScript

## License

MIT
