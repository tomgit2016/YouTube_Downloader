use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::{Command, Child};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

// Type definitions
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoMetadata {
    pub title: String,
    pub thumbnail: String,
    pub duration: String,
    pub uploader: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoInfo {
    pub id: String,
    pub title: String,
    pub description: String,
    pub duration: u64,
    pub uploader: String,
    pub thumbnail: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoFormat {
    pub id: String,
    pub ext: String,
    pub resolution: String,
    pub fps: u32,
    pub filesize: Option<u64>,
    pub vcodec: String,
    pub acodec: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Subtitle {
    pub lang: String,
    pub name: String,
    pub format: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadOptions {
    pub url: String,
    pub format: String,
    pub output: String,
    pub subtitles: bool,
    pub subtitle_langs: Option<Vec<String>>,
    pub cookies: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadProgress {
    pub id: String,
    pub progress: f64,
    pub speed: String,
    pub eta: String,
    pub downloaded: String,
    pub total_size: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RecentDownload {
    pub id: String,
    pub title: String,
    pub url: String,
    pub file_path: String,
    pub thumbnail: String,
    pub size: u64,
    pub duration: u64,
    pub quality: String,
    pub downloaded_at: String,
    pub format: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Credentials {
    pub access_token: String,
    pub refresh_token: String,
    pub cookies: String,
}

// Global state for tracking downloads
pub struct DownloadManager {
    downloads: Mutex<HashMap<String, Child>>,
}

impl DownloadManager {
    pub fn new() -> Self {
        Self {
            downloads: Mutex::new(HashMap::new()),
        }
    }
}

// Helper function to get recent downloads storage path
fn get_recent_downloads_path() -> Result<PathBuf, String> {
    let mut path = dirs::home_dir()
        .ok_or("Failed to get home directory")?;
    path.push(".youtube-downloader");
    path.push("recent-downloads.json");
    
    // Create directory if it doesn't exist
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    Ok(path)
}

// Helper function to validate YouTube URL
#[tauri::command]
pub fn validate_url(url: String) -> Result<VideoMetadata, String> {
    // Basic YouTube URL validation
    let youtube_regex = regex::Regex::new(
        r"^(https?://)?(www\.)?(youtube\.com/(watch\?v=|shorts/)|youtu\.be/)[\w-]+"
    ).map_err(|e| format!("Failed to create regex: {}", e))?;

    if !youtube_regex.is_match(&url) {
        return Err("Invalid YouTube URL".to_string());
    }

    // For now, return a placeholder metadata
    // In a real implementation, we would use yt-dlp to fetch actual metadata
    Ok(VideoMetadata {
        title: "Video Title".to_string(),
        thumbnail: "".to_string(),
        duration: "0:00".to_string(),
        uploader: "Uploader".to_string(),
    })
}

// Helper struct to hold yt-dlp path and resources directory
struct YtDlpInfo {
    path: String,
    resources_dir: Option<String>,
    bun_path: Option<String>,
}

// Helper function to find yt-dlp executable
fn find_yt_dlp() -> Result<String, String> {
    find_yt_dlp_with_resources().map(|info| info.path)
}

// Helper function to find yt-dlp executable and resources directory
fn find_yt_dlp_with_resources() -> Result<YtDlpInfo, String> {
    // First, try to find the bundled yt-dlp in the Resources directory
    // When running as a bundled app, the executable is in .app/Contents/MacOS/
    // and resources are in .app/Contents/Resources/
    if let Ok(exe_path) = std::env::current_exe() {
        let exe_str = exe_path.to_string_lossy().to_string();
        eprintln!("DEBUG: exe_path = {}", exe_str);
        
        if let Some(contents_dir) = exe_path.parent().and_then(|p| p.parent()) {
            let contents_dir_str = contents_dir.to_string_lossy().to_string();
            eprintln!("DEBUG: contents_dir = {}", contents_dir_str);
            
            // Try Resources/binaries/yt-dlp first (this is where Tauri bundles resources)
            let binaries_path = contents_dir.join("Resources").join("binaries").join("yt-dlp");
            let binaries_path_str = binaries_path.to_string_lossy().to_string();
            eprintln!("DEBUG: checking binaries_path = {}, exists = {}", binaries_path_str, binaries_path.exists());
            
            if binaries_path.exists() {
                eprintln!("DEBUG: Found yt-dlp at {}", binaries_path_str);
                // Return the binaries directory so bun can be found there too
                let binaries_dir = contents_dir.join("Resources").join("binaries").to_string_lossy().to_string();
                
                // Check for bundled bun
                let bun_path = contents_dir.join("Resources").join("binaries").join("bun");
                let bun_path_str = if bun_path.exists() {
                    eprintln!("DEBUG: Found bundled bun at {}", bun_path.to_string_lossy());
                    Some(bun_path.to_string_lossy().to_string())
                } else {
                    eprintln!("DEBUG: Bundled bun not found at {}", bun_path.to_string_lossy());
                    None
                };
                
                return Ok(YtDlpInfo { 
                    path: binaries_path_str, 
                    resources_dir: Some(binaries_dir),
                    bun_path: bun_path_str,
                });
            }
            
            // Try Resources/yt-dlp as fallback
            let resources_path = contents_dir.join("Resources").join("yt-dlp");
            let resources_path_str = resources_path.to_string_lossy().to_string();
            eprintln!("DEBUG: checking resources_path = {}, exists = {}", resources_path_str, resources_path.exists());
            
            if resources_path.exists() {
                eprintln!("DEBUG: Found yt-dlp at {}", resources_path_str);
                let res_dir = contents_dir.join("Resources").to_string_lossy().to_string();
                
                // Check for bun in Resources
                let bun_path = contents_dir.join("Resources").join("bun");
                let bun_path_str = if bun_path.exists() {
                    Some(bun_path.to_string_lossy().to_string())
                } else {
                    None
                };
                
                return Ok(YtDlpInfo { 
                    path: resources_path_str, 
                    resources_dir: Some(res_dir),
                    bun_path: bun_path_str,
                });
            }
        }
    }

    // Fallback: try to find yt-dlp using 'which' command
    eprintln!("DEBUG: Trying 'which' command");
    let output = Command::new("which")
        .arg("yt-dlp")
        .output()
        .map_err(|e| format!("Failed to run 'which' command: {}", e))?;

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        eprintln!("DEBUG: 'which' found yt-dlp at {}", path);
        if !path.is_empty() {
            Ok(YtDlpInfo { path, resources_dir: None, bun_path: None })
        } else {
            Err("yt-dlp not found. Please install yt-dlp using: brew install yt-dlp".to_string())
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!("DEBUG: 'which' failed: {}", stderr);
        Err("yt-dlp not found. Please install yt-dlp using: brew install yt-dlp".to_string())
    }
}

// Helper function to configure command with bundled resources in PATH and JS runtime
fn configure_command_env(cmd: &mut Command, yt_dlp_info: &YtDlpInfo) {
    if let Some(res_dir) = &yt_dlp_info.resources_dir {
        // Add the resources directory to PATH so yt-dlp can find bundled bun
        let current_path = std::env::var("PATH").unwrap_or_default();
        let new_path = format!("{}:{}", res_dir, current_path);
        cmd.env("PATH", new_path);
        eprintln!("DEBUG: Set PATH to include resources dir: {}", res_dir);
    }
    
    // Explicitly tell yt-dlp where to find bun using --js-runtimes
    // --no-js-runtimes clears the deno default so bun takes priority
    if let Some(bun_path) = &yt_dlp_info.bun_path {
        cmd.arg("--no-js-runtimes");
        cmd.arg("--js-runtimes").arg(format!("bun:{}", bun_path));
        eprintln!("DEBUG: Set --js-runtimes bun:{}", bun_path);
    }
}

// Helper function to get cookies file path
fn get_cookies_path() -> Result<String, String> {
    let mut path = dirs::home_dir()
        .ok_or("Failed to get home directory")?;
    path.push(".youtube-downloader");
    path.push("cookies.txt");
    
    if path.exists() {
        Ok(path.to_string_lossy().to_string())
    } else {
        Err("Cookies file not found. Please run: yt-dlp --cookies-from-browser chrome --cookies ~/.youtube-downloader/cookies.txt --skip-download \"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"".to_string())
    }
}

// Helper function to find ffmpeg executable
fn find_ffmpeg() -> Option<String> {
    // Common ffmpeg locations on macOS
    let common_paths = [
        "/opt/homebrew/bin/ffmpeg",      // Homebrew on Apple Silicon
        "/usr/local/bin/ffmpeg",          // Homebrew on Intel
        "/usr/bin/ffmpeg",                // System PATH
    ];
    
    for path in &common_paths {
        if std::path::Path::new(path).exists() {
            return Some(path.to_string());
        }
    }
    
    // Try to find using 'which' command
    if let Ok(output) = Command::new("which").arg("ffmpeg").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Some(path);
            }
        }
    }
    
    None
}

// Get video info using yt-dlp
#[tauri::command]
pub async fn get_video_info(url: String) -> Result<VideoInfo, String> {
    let yt_dlp_info = find_yt_dlp_with_resources()?;
    let cookies_path = get_cookies_path()?;

    let mut cmd = Command::new(&yt_dlp_info.path);
    configure_command_env(&mut cmd, &yt_dlp_info);
    
    let output = cmd
        .args([
            "--cookies", &cookies_path,
            "--dump-json", 
            "--no-playlist",
            &url
        ])
        .output()
        .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp error: {}", stderr));
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    Ok(VideoInfo {
        id: json["id"].as_str().unwrap_or("").to_string(),
        title: json["title"].as_str().unwrap_or("").to_string(),
        description: json["description"].as_str().unwrap_or("").to_string(),
        duration: json["duration"].as_u64().unwrap_or(0),
        uploader: json["uploader"].as_str().unwrap_or("").to_string(),
        thumbnail: json["thumbnail"].as_str().unwrap_or("").to_string(),
    })
}

// Combined response for video info, formats, and subtitles
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CombinedVideoInfo {
    pub info: VideoInfo,
    pub formats: Vec<VideoFormat>,
    pub subtitles: Vec<Subtitle>,
}

// Get video info, formats, and subtitles in a single yt-dlp call (faster)
#[tauri::command]
pub async fn get_video_info_combined(url: String) -> Result<CombinedVideoInfo, String> {
    let yt_dlp_info = find_yt_dlp_with_resources()?;
    let cookies_path = get_cookies_path()?;

    let mut cmd = Command::new(&yt_dlp_info.path);
    configure_command_env(&mut cmd, &yt_dlp_info);
    
    let output = cmd
        .args([
            "--cookies", &cookies_path,
            "--dump-json", 
            "--no-playlist",
            &url
        ])
        .output()
        .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp error: {}", stderr));
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    // Extract video info
    let info = VideoInfo {
        id: json["id"].as_str().unwrap_or("").to_string(),
        title: json["title"].as_str().unwrap_or("").to_string(),
        description: json["description"].as_str().unwrap_or("").to_string(),
        duration: json["duration"].as_u64().unwrap_or(0),
        uploader: json["uploader"].as_str().unwrap_or("").to_string(),
        thumbnail: json["thumbnail"].as_str().unwrap_or("").to_string(),
    };

    // Extract formats
    let mut formats = Vec::new();
    if let Some(format_array) = json["formats"].as_array() {
        for format in format_array {
            if let Some(ext) = format["ext"].as_str() {
                if ext == "mp4" || ext == "webm" || ext == "mkv" {
                    formats.push(VideoFormat {
                        id: format["format_id"].as_str().unwrap_or("").to_string(),
                        ext: ext.to_string(),
                        resolution: format["resolution"].as_str().unwrap_or("").to_string(),
                        fps: format["fps"].as_u64().unwrap_or(0) as u32,
                        filesize: format["filesize"].as_u64(),
                        vcodec: format["vcodec"].as_str().unwrap_or("").to_string(),
                        acodec: format["acodec"].as_str().unwrap_or("").to_string(),
                    });
                }
            }
        }
    }

    // Extract subtitles
    let mut subtitles = Vec::new();
    if let Some(subs) = json["subtitles"].as_object() {
        for (lang, data) in subs {
            if let Some(sub_array) = data.as_array() {
                if let Some(first_sub) = sub_array.first() {
                    subtitles.push(Subtitle {
                        lang: lang.clone(),
                        name: first_sub["name"].as_str().unwrap_or(lang).to_string(),
                        format: first_sub["ext"].as_str().unwrap_or("srt").to_string(),
                    });
                }
            }
        }
    }

    Ok(CombinedVideoInfo { info, formats, subtitles })
}

// Get available formats
#[tauri::command]
pub async fn get_available_formats(url: String) -> Result<Vec<VideoFormat>, String> {
    let yt_dlp_info = find_yt_dlp_with_resources()?;
    let cookies_path = get_cookies_path()?;

    // Use --dump-json to get JSON output (formats are included in the video info)
    let mut cmd = Command::new(&yt_dlp_info.path);
    configure_command_env(&mut cmd, &yt_dlp_info);
    
    let output = cmd
        .args([
            "--cookies", &cookies_path,
            "--dump-json", 
            "--no-playlist",
            &url
        ])
        .output()
        .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp error: {}", stderr));
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let formats = json["formats"].as_array()
        .ok_or("No formats found")?;

    let mut video_formats = Vec::new();
    for format in formats {
        if let Some(ext) = format["ext"].as_str() {
            if ext == "mp4" || ext == "webm" || ext == "mkv" {
                video_formats.push(VideoFormat {
                    id: format["format_id"].as_str().unwrap_or("").to_string(),
                    ext: ext.to_string(),
                    resolution: format["resolution"].as_str().unwrap_or("").to_string(),
                    fps: format["fps"].as_u64().unwrap_or(0) as u32,
                    filesize: format["filesize"].as_u64(),
                    vcodec: format["vcodec"].as_str().unwrap_or("").to_string(),
                    acodec: format["acodec"].as_str().unwrap_or("").to_string(),
                });
            }
        }
    }

    Ok(video_formats)
}

// Get available subtitles
#[tauri::command]
pub async fn get_available_subtitles(url: String) -> Result<Vec<Subtitle>, String> {
    let yt_dlp_info = find_yt_dlp_with_resources()?;
    let cookies_path = get_cookies_path()?;

    // Use --dump-json to get JSON output (subtitles are included in the video info)
    let mut cmd = Command::new(&yt_dlp_info.path);
    configure_command_env(&mut cmd, &yt_dlp_info);
    
    let output = cmd
        .args([
            "--cookies", &cookies_path,
            "--dump-json", 
            "--no-playlist",
            &url
        ])
        .output()
        .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp error: {}", stderr));
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut subtitle_list = Vec::new();
    
    // Check both "subtitles" and "automatic_captions" fields
    if let Some(subtitles) = json["subtitles"].as_object() {
        for (lang, data) in subtitles {
            if let Some(sub_array) = data.as_array() {
                if let Some(first_sub) = sub_array.first() {
                    subtitle_list.push(Subtitle {
                        lang: lang.clone(),
                        name: first_sub["name"].as_str().unwrap_or(lang).to_string(),
                        format: first_sub["ext"].as_str().unwrap_or("srt").to_string(),
                    });
                }
            }
        }
    }

    Ok(subtitle_list)
}

// Start download
#[tauri::command]
pub async fn start_download(
    options: DownloadOptions,
    app: AppHandle,
    _manager: State<'_, DownloadManager>,
) -> Result<String, String> {
    let download_id = uuid::Uuid::new_v4().to_string();
    let app_clone = app.clone();

    // Build yt-dlp command
    let yt_dlp_info = find_yt_dlp_with_resources()?;
    let cookies_path = get_cookies_path()?;
    let mut cmd = Command::new(&yt_dlp_info.path);
    
    // Configure PATH and JS runtime to include bundled resources (bun)
    configure_command_env(&mut cmd, &yt_dlp_info);
    
    // Use cookies file for authentication
    cmd.arg("--cookies").arg(&cookies_path);
    
    // Set ffmpeg location if found (required for merging video+audio)
    if let Some(ffmpeg_path) = find_ffmpeg() {
        // Get the directory containing ffmpeg
        if let Some(ffmpeg_dir) = std::path::Path::new(&ffmpeg_path).parent() {
            cmd.arg("--ffmpeg-location").arg(ffmpeg_dir);
        }
    }
    
    // Use best video+audio format and let yt-dlp merge them properly
    // This avoids the MPEG-TS container issues and ensures seekable video
    cmd.arg("-f").arg("bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best");
    cmd.arg("--merge-output-format").arg("mp4");
    
    cmd.arg("-o").arg(&options.output);
    cmd.arg("--newline");
    cmd.arg("--progress");
    
    // Always download English subtitles automatically (manual subs only, no auto-generated)
    cmd.arg("--write-subs");
    cmd.arg("--sub-langs").arg("en");
    cmd.arg("--sub-format").arg("srt/best");
    cmd.arg("--convert-subs").arg("srt");

    if let Some(cookies) = &options.cookies {
        cmd.arg("--cookies").arg(cookies);
    }

    cmd.arg(&options.url);

    // Redirect stderr to stdout so we can capture all output
    let mut child = cmd
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::inherit()) // Let errors show in terminal
        .spawn()
        .map_err(|e| format!("Failed to start download: {}", e))?;

    let download_id_for_task = download_id.clone();
    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    
    // Spawn a thread to monitor the download progress
    std::thread::spawn(move || {
        use std::io::{BufRead, BufReader};
        
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            eprintln!("yt-dlp: {}", line); // Debug output to terminal
            
            // Parse progress from yt-dlp output
            if line.contains("[download]") && line.contains("%") {
                if let Some(progress) = parse_progress(&line) {
                    eprintln!("Emitting progress: {}% speed={} eta={}", progress.0, progress.1, progress.2);
                    let emit_result = app_clone.emit("download-progress", serde_json::json!({
                        "id": download_id_for_task.clone(),
                        "progress": progress.0,
                        "speed": progress.1,
                        "eta": progress.2
                    }));
                    if let Err(e) = emit_result {
                        eprintln!("Failed to emit progress: {}", e);
                    }
                }
            }
        }
        
        // Wait for the process to finish
        let status = child.wait();
        eprintln!("Download finished with status: {:?}", status);
        
        // Emit completion event
        eprintln!("Emitting download-complete for: {}", download_id_for_task);
        let emit_result = app_clone.emit("download-complete", download_id_for_task);
        if let Err(e) = emit_result {
            eprintln!("Failed to emit download-complete: {}", e);
        }
    });

    Ok(download_id)
}

// Helper function to parse progress from yt-dlp output
fn parse_progress(line: &str) -> Option<(f64, String, String)> {
    // Example: [download]  45.2% of 100.00MiB at 5.00MiB/s ETA 00:10
    let progress_regex = regex::Regex::new(r"(\d+\.?\d*)%.*?at\s+(\S+).*?ETA\s+(\S+)").ok()?;
    
    if let Some(caps) = progress_regex.captures(line) {
        let progress: f64 = caps.get(1)?.as_str().parse().ok()?;
        let speed = caps.get(2)?.as_str().to_string();
        let eta = caps.get(3)?.as_str().to_string();
        return Some((progress, speed, eta));
    }
    
    // Simpler fallback: just get percentage
    let simple_regex = regex::Regex::new(r"(\d+\.?\d*)%").ok()?;
    if let Some(caps) = simple_regex.captures(line) {
        let progress: f64 = caps.get(1)?.as_str().parse().ok()?;
        return Some((progress, "".to_string(), "".to_string()));
    }
    
    None
}

// Cancel download
#[tauri::command]
pub async fn cancel_download(id: String, manager: State<'_, DownloadManager>) -> Result<(), String> {
    let mut downloads = manager.downloads.lock().unwrap();
    if let Some(mut child) = downloads.remove(&id) {
        child.kill().map_err(|e| format!("Failed to kill process: {}", e))?;
        Ok(())
    } else {
        Err("Download not found".to_string())
    }
}

// Get download progress
#[tauri::command]
pub async fn get_download_progress(id: String) -> Result<DownloadProgress, String> {
    // For now, return a placeholder
    // In a real implementation, we would track actual progress
    Ok(DownloadProgress {
        id,
        progress: 0.0,
        speed: "0B/s".to_string(),
        eta: "0:00".to_string(),
        downloaded: "0B".to_string(),
        total_size: "0B".to_string(),
    })
}

// Save credentials
#[tauri::command]
pub async fn save_credentials(credentials: Credentials) -> Result<(), String> {
    let mut path = dirs::home_dir()
        .ok_or("Failed to get home directory")?;
    path.push(".youtube-downloader");
    path.push("credentials.json");
    
    // Create directory if it doesn't exist
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    let json = serde_json::to_string_pretty(&credentials)
        .map_err(|e| format!("Failed to serialize credentials: {}", e))?;
    
    fs::write(&path, json).map_err(|e| format!("Failed to write credentials: {}", e))?;
    
    Ok(())
}

// Load credentials
#[tauri::command]
pub async fn load_credentials() -> Result<Credentials, String> {
    let mut path = dirs::home_dir()
        .ok_or("Failed to get home directory")?;
    path.push(".youtube-downloader");
    path.push("credentials.json");
    
    let content = fs::read_to_string(&path)
        .map_err(|_| "No credentials found".to_string())?;
    
    let credentials: Credentials = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse credentials: {}", e))?;
    
    Ok(credentials)
}

// Clear credentials
#[tauri::command]
pub async fn clear_credentials() -> Result<(), String> {
    let mut path = dirs::home_dir()
        .ok_or("Failed to get home directory")?;
    path.push(".youtube-downloader");
    path.push("credentials.json");
    
    fs::remove_file(&path).map_err(|e| format!("Failed to remove credentials: {}", e))?;
    
    Ok(())
}

// Test function to verify yt-dlp path resolution
#[tauri::command]
pub async fn test_yt_dlp() -> Result<String, String> {
    let output = Command::new("which")
        .arg("yt-dlp")
        .output()
        .map_err(|_| "yt-dlp not found".to_string())?;
    
    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(path)
}

// Select save location
#[tauri::command]
pub async fn select_save_location() -> Result<String, String> {
    use std::process::Command;
    
    // Use osascript to show a folder picker dialog on macOS
    let output = Command::new("osascript")
        .args([
            "-e",
            r#"set chosenFolder to choose folder with prompt "Select download location"
            return POSIX path of chosenFolder"#
        ])
        .output()
        .map_err(|e| format!("Failed to open folder picker: {}", e))?;
    
    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() {
            return Ok(path);
        }
    }
    
    // User cancelled the dialog - return error so frontend knows not to update
    Err("Folder selection cancelled".to_string())
}

// Get default save location (without dialog)
#[tauri::command]
pub async fn get_default_save_location() -> Result<String, String> {
    // First try to load saved location
    let mut saved_path = dirs::home_dir()
        .ok_or("Failed to get home directory")?;
    saved_path.push(".youtube-downloader");
    saved_path.push("save-location.txt");
    
    if saved_path.exists() {
        if let Ok(location) = fs::read_to_string(&saved_path) {
            let location = location.trim().to_string();
            if !location.is_empty() && std::path::Path::new(&location).exists() {
                return Ok(location);
            }
        }
    }
    
    // Fallback to default downloads directory
    let path = dirs::download_dir()
        .ok_or("Failed to get downloads directory")?;
    
    Ok(path.to_string_lossy().to_string())
}

// Save the last used save location
#[tauri::command]
pub async fn save_last_location(location: String) -> Result<(), String> {
    let mut path = dirs::home_dir()
        .ok_or("Failed to get home directory")?;
    path.push(".youtube-downloader");
    
    // Create directory if it doesn't exist
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;
    
    path.push("save-location.txt");
    fs::write(&path, &location).map_err(|e| format!("Failed to save location: {}", e))?;
    
    Ok(())
}

// Get recent downloads
#[tauri::command]
pub async fn get_recent_downloads() -> Result<Vec<RecentDownload>, String> {
    let path = get_recent_downloads_path()?;
    
    if !path.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read recent downloads: {}", e))?;
    
    let downloads: Vec<RecentDownload> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse recent downloads: {}", e))?;
    
    Ok(downloads)
}

// Save a recent download
#[tauri::command]
pub async fn save_recent_download(download: RecentDownload) -> Result<(), String> {
    let path = get_recent_downloads_path()?;
    
    // Load existing downloads
    let mut downloads: Vec<RecentDownload> = if path.exists() {
        let content = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read recent downloads: {}", e))?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };
    
    // Add new download at the beginning
    downloads.insert(0, download);
    
    // Keep only the last 100 downloads
    downloads.truncate(100);
    
    // Save back to file
    let json = serde_json::to_string_pretty(&downloads)
        .map_err(|e| format!("Failed to serialize recent downloads: {}", e))?;
    
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write recent downloads: {}", e))?;
    
    Ok(())
}

// Open file
#[tauri::command]
pub async fn open_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    Ok(())
}

// Open file with application chooser
#[tauri::command]
pub async fn open_file_with(path: String, app_path: Option<String>) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if let Some(app) = app_path {
            // Open with specific app
            Command::new("open")
                .args(["-a", &app, &path])
                .spawn()
                .map_err(|e| format!("Failed to open file with app: {}", e))?;
        } else {
            // Show app chooser dialog
            Command::new("osascript")
                .args([
                    "-e",
                    &format!(
                        r#"set theFile to POSIX file "{}"
                        tell application "Finder"
                            open theFile using (choose application with prompt "Open with:")
                        end tell"#,
                        path
                    )
                ])
                .spawn()
                .map_err(|e| format!("Failed to open file with: {}", e))?;
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        Command::new("rundll32")
            .args(["shell32.dll,OpenAs_RunDLL", &path])
            .spawn()
            .map_err(|e| format!("Failed to open file with: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file with: {}", e))?;
    }
    
    Ok(())
}

// Get list of apps that can open a file type
#[tauri::command]
pub async fn get_apps_for_file(path: String) -> Result<Vec<(String, String, String)>, String> {
    #[cfg(target_os = "macos")]
    {
        use std::io::Write;
        
        // Single Swift script to get all apps and their icons
        let swift_code = format!(r#"
import AppKit
import Foundation

let filePath = "{}"
let fileURL = URL(fileURLWithPath: filePath)
let workspace = NSWorkspace.shared

guard let appURLs = workspace.urlsForApplications(toOpen: fileURL) as [URL]? else {{
    exit(1)
}}

for appURL in appURLs {{
    let appPath = appURL.path
    let appName = appURL.deletingPathExtension().lastPathComponent
    
    // Get icon
    var iconBase64 = ""
    if let icon = workspace.icon(forFile: appPath) as NSImage? {{
        let newSize = NSSize(width: 16, height: 16)
        let newImage = NSImage(size: newSize)
        newImage.lockFocus()
        icon.draw(in: NSRect(origin: .zero, size: newSize), from: NSRect(origin: .zero, size: icon.size), operation: .sourceOver, fraction: 1.0)
        newImage.unlockFocus()
        
        if let tiffData = newImage.tiffRepresentation,
           let bitmapRep = NSBitmapImageRep(data: tiffData),
           let pngData = bitmapRep.representation(using: .png, properties: [:]) {{
            iconBase64 = pngData.base64EncodedString()
        }}
    }}
    
    print("\(appName)|\(appPath)|\(iconBase64)")
}}
"#, path);

        // Write Swift code to temp file
        let temp_dir = std::env::temp_dir();
        let swift_file = temp_dir.join("get_apps_icons.swift");
        
        if let Ok(mut file) = fs::File::create(&swift_file) {
            if file.write_all(swift_code.as_bytes()).is_err() {
                return Err("Failed to write Swift script".to_string());
            }
        }

        // Execute Swift script
        let output = Command::new("swift")
            .arg(&swift_file)
            .output()
            .map_err(|e| format!("Failed to execute Swift: {}", e))?;
        
        if output.status.success() {
            let result = String::from_utf8_lossy(&output.stdout);
            let apps: Vec<(String, String, String)> = result
                .trim()
                .lines()
                .filter_map(|line| {
                    let parts: Vec<&str> = line.splitn(3, '|').collect();
                    if parts.len() == 3 {
                        Some((parts[0].to_string(), parts[1].to_string(), parts[2].to_string()))
                    } else {
                        None
                    }
                })
                .collect();
            Ok(apps)
        } else {
            // Fallback
            Ok(vec![
                ("QuickTime Player".to_string(), "/System/Applications/QuickTime Player.app".to_string(), String::new()),
            ])
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Ok(vec![])
    }
}

// Helper function to get app icon as base64 PNG (kept for potential future use)
#[cfg(target_os = "macos")]
#[allow(dead_code)]
fn get_app_icon_base64(app_path: &str) -> Option<String> {
    use std::io::Write;
    
    let swift_code = format!(r#"
import AppKit
import Foundation

let appPath = "{}"
let workspace = NSWorkspace.shared
guard let icon = workspace.icon(forFile: appPath) as NSImage? else {{
    exit(1)
}}

let newSize = NSSize(width: 16, height: 16)
let newImage = NSImage(size: newSize)
newImage.lockFocus()
icon.draw(in: NSRect(origin: .zero, size: newSize), from: NSRect(origin: .zero, size: icon.size), operation: .sourceOver, fraction: 1.0)
newImage.unlockFocus()

guard let tiffData = newImage.tiffRepresentation,
      let bitmapRep = NSBitmapImageRep(data: tiffData),
      let pngData = bitmapRep.representation(using: .png, properties: [:]) else {{
    exit(1)
}}

print(pngData.base64EncodedString())
"#, app_path);

    let temp_dir = std::env::temp_dir();
    let swift_file = temp_dir.join("get_icon.swift");
    
    if let Ok(mut file) = fs::File::create(&swift_file) {
        if file.write_all(swift_code.as_bytes()).is_err() {
            return None;
        }
    } else {
        return None;
    }

    let output = Command::new("swift")
        .arg(&swift_file)
        .output()
        .ok()?;
    
    if output.status.success() {
        let base64 = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !base64.is_empty() {
            return Some(base64);
        }
    }
    None
}

// Open in folder
#[tauri::command]
pub async fn open_in_folder(path: String) -> Result<(), String> {
    let path_obj = PathBuf::from(&path);
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(&path_obj)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg("/select,")
            .arg(&path_obj)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("dbus-send")
            .args([
                "--session",
                "--dest=org.freedesktop.FileManager1",
                "--type=method_call",
                "/org/freedesktop/FileManager1",
                "org.freedesktop.FileManager1.ShowItems",
                format!("array:string:file://{}", path_obj.to_string_lossy()),
                "string:",
            ])
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    Ok(())
}

// Delete file
#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    // Delete the main file
    fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))?;
    
    // Also delete associated subtitle files
    let path_obj = PathBuf::from(&path);
    if let Some(stem) = path_obj.file_stem() {
        if let Some(parent) = path_obj.parent() {
            let stem_str = stem.to_string_lossy();
            
            // Common subtitle extensions
            let subtitle_extensions = ["srt", "vtt", "ass", "sub", "ssa"];
            // Common language suffixes
            let lang_suffixes = ["", ".en", ".eng", ".en-orig"];
            
            for ext in &subtitle_extensions {
                for suffix in &lang_suffixes {
                    let sub_filename = format!("{}{}.{}", stem_str, suffix, ext);
                    let sub_path = parent.join(&sub_filename);
                    if sub_path.exists() {
                        let _ = fs::remove_file(&sub_path); // Ignore errors for subtitle deletion
                    }
                }
            }
        }
    }
    
    Ok(())
}

// Clear recent downloads
#[tauri::command]
pub async fn clear_recent_downloads() -> Result<(), String> {
    let path = get_recent_downloads_path()?;
    
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to clear recent downloads: {}", e))?;
    }
    
    Ok(())
}

// Remove a single recent download by ID
#[tauri::command]
pub async fn remove_recent_download(id: String) -> Result<(), String> {
    let path = get_recent_downloads_path()?;
    
    if !path.exists() {
        return Ok(());
    }
    
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read recent downloads: {}", e))?;
    
    let mut downloads: Vec<RecentDownload> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse recent downloads: {}", e))?;
    
    // Remove the download with the matching ID
    downloads.retain(|d| d.id != id);
    
    // Save back to file
    let json = serde_json::to_string_pretty(&downloads)
        .map_err(|e| format!("Failed to serialize recent downloads: {}", e))?;
    
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write recent downloads: {}", e))?;
    
    Ok(())
}

// Get file size
#[tauri::command]
pub async fn get_file_size(path: String) -> Result<u64, String> {
    let metadata = fs::metadata(&path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;
    Ok(metadata.len())
}

// Refresh cookies from browser
#[tauri::command]
pub async fn refresh_cookies(browser: Option<String>) -> Result<(), String> {
    let yt_dlp_info = find_yt_dlp_with_resources()?;
    
    let mut cookies_path = dirs::home_dir()
        .ok_or("Failed to get home directory")?;
    cookies_path.push(".youtube-downloader");
    
    // Create directory if it doesn't exist
    fs::create_dir_all(&cookies_path).map_err(|e| format!("Failed to create directory: {}", e))?;
    
    cookies_path.push("cookies.txt");
    let cookies_path_str = cookies_path.to_string_lossy().to_string();
    
    // Default to Chrome if no browser specified
    let browser_name = browser.unwrap_or_else(|| "chrome".to_string());
    
    let mut cmd = Command::new(&yt_dlp_info.path);
    configure_command_env(&mut cmd, &yt_dlp_info);
    
    let output = cmd
        .args([
            "--cookies-from-browser", &browser_name,
            "--cookies", &cookies_path_str,
            "--skip-download",
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        ])
        .output()
        .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to refresh cookies: {}", stderr));
    }
    
    Ok(())
}

// Check if error indicates expired/invalid cookies
fn is_cookie_error(error: &str) -> bool {
    let cookie_error_patterns = [
        "Sign in to confirm your age",
        "Sign in to confirm you're not a bot",
        "This video is available to this channel's members",
        "Join this channel to get access",
        "Private video",
        "Video unavailable",
        "cookies",
        "login",
        "sign in",
        "authentication",
    ];
    
    let error_lower = error.to_lowercase();
    cookie_error_patterns.iter().any(|pattern| error_lower.contains(&pattern.to_lowercase()))
}

// Get video info with auto cookie refresh on auth errors
#[tauri::command]
pub async fn get_video_info_with_refresh(url: String) -> Result<CombinedVideoInfo, String> {
    // First attempt
    match get_video_info_combined(url.clone()).await {
        Ok(info) => Ok(info),
        Err(e) if is_cookie_error(&e) => {
            eprintln!("Cookie error detected, attempting to refresh cookies...");
            
            // Try to refresh cookies
            if let Err(refresh_err) = refresh_cookies(None).await {
                return Err(format!("Original error: {}. Cookie refresh also failed: {}", e, refresh_err));
            }
            
            // Retry the request
            get_video_info_combined(url).await
                .map_err(|retry_err| format!("Failed after cookie refresh: {}", retry_err))
        }
        Err(e) => Err(e),
    }
}
