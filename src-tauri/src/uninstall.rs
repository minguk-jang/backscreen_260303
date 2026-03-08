#[cfg(any(target_os = "windows", test))]
use std::path::{Path, PathBuf};

#[cfg(any(target_os = "windows", test))]
pub fn uninstall_executable_path(current_exe: &Path) -> Result<PathBuf, String> {
    let install_dir = current_exe
        .parent()
        .ok_or_else(|| "앱 설치 경로를 찾을 수 없습니다.".to_string())?;
    Ok(install_dir.join("uninstall.exe"))
}

#[cfg(target_os = "windows")]
pub fn launch_uninstaller() -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(crate::error::to_err)?;
    let uninstall_exe = uninstall_executable_path(&current_exe)?;

    if !uninstall_exe.exists() {
        return Err(
            "언인스톨러를 찾을 수 없습니다. Windows '설정 > 앱 > 설치된 앱'에서 BackScreen을 제거해 주세요."
                .to_string(),
        );
    }

    std::process::Command::new(&uninstall_exe)
        .spawn()
        .map_err(crate::error::to_err)?;
    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn launch_uninstaller() -> Result<(), String> {
    Err("Windows 설치 환경에서만 앱 제거를 지원합니다.".to_string())
}

#[cfg(test)]
mod tests {
    use super::uninstall_executable_path;
    use std::path::PathBuf;

    #[test]
    fn uninstall_path_is_resolved_in_same_directory() {
        let current = PathBuf::from("/opt/backscreen/backscreen");
        let resolved = uninstall_executable_path(&current).expect("path resolve failed");
        assert_eq!(resolved, PathBuf::from("/opt/backscreen/uninstall.exe"));
    }
}
