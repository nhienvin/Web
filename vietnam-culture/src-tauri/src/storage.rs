use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs::{self, File},
    io::{Read, Write},
    path::PathBuf,
};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LevelProgress {
    pub completed: bool,
    #[serde(default)]
    pub attempts: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub best_time_ms: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuestProfile {
    pub id: String,
    pub nickname: String,
    pub avatar_id: String,
    #[serde(default)]
    pub progress: HashMap<String, LevelProgress>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentProfile {
    pub id: String,
    pub nickname: String,
    pub avatar_id: String,
    pub class_id: String,
    #[serde(default)]
    pub progress: HashMap<String, LevelProgress>,
    pub joined_at: String,
    pub last_sync_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeacherInfo {
    pub id: String,
    pub nickname: String,
    pub avatar_id: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ClassRoom {
    pub id: String,
    pub teacher: TeacherInfo,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(default)]
    pub students: HashMap<String, StudentProfile>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileStore {
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(default)]
    pub guests: HashMap<String, GuestProfile>,
    #[serde(default)]
    pub classes: HashMap<String, ClassRoom>,
}

impl Default for ProfileStore {
    fn default() -> Self {
        Self {
            version: default_version(),
            guests: HashMap::new(),
            classes: HashMap::new(),
        }
    }
}

fn default_version() -> u32 {
    1
}

const STORE_FILE_NAME: &str = "profiles.json";

fn store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|err| err.to_string())?;
    if dir.as_os_str().is_empty() {
        return Err("app data dir not available".into());
    }
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    dir.push(STORE_FILE_NAME);
    Ok(dir)
}

fn read_store_from_path(path: &PathBuf) -> Result<ProfileStore, String> {
    if !path.exists() {
        return Ok(ProfileStore::default());
    }
    let mut file = File::open(path).map_err(|err| err.to_string())?;
    let mut buf = String::new();
    file.read_to_string(&mut buf).map_err(|err| err.to_string())?;
    if buf.trim().is_empty() {
        return Ok(ProfileStore::default());
    }
    serde_json::from_str::<ProfileStore>(&buf).map_err(|err| err.to_string())
}

fn write_store_to_path(path: &PathBuf, store: &ProfileStore) -> Result<(), String> {
    let serialized =
        serde_json::to_string_pretty(store).map_err(|err| err.to_string())?;
    let mut file = File::create(path).map_err(|err| err.to_string())?;
    file.write_all(serialized.as_bytes())
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn load_profile_store(app: tauri::AppHandle) -> Result<ProfileStore, String> {
    let path = store_path(&app)?;
    read_store_from_path(&path)
}

#[tauri::command]
pub fn save_profile_store(
    app: tauri::AppHandle,
    store: ProfileStore,
) -> Result<(), String> {
    let path = store_path(&app)?;
    write_store_to_path(&path, &store)
}
