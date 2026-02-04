// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::DownloadManager;

fn main() {
    let download_manager = DownloadManager::new();

    tauri::Builder::default()
        .manage(download_manager)
        .invoke_handler(tauri::generate_handler![
            commands::validate_url,
            commands::get_video_info,
            commands::get_available_formats,
            commands::get_available_subtitles,
            commands::start_download,
            commands::cancel_download,
            commands::get_download_progress,
            commands::save_credentials,
            commands::load_credentials,
            commands::clear_credentials,
            commands::select_save_location,
            commands::get_recent_downloads,
            commands::save_recent_download,
            commands::open_file,
            commands::open_in_folder,
            commands::delete_file,
            commands::clear_recent_downloads,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
