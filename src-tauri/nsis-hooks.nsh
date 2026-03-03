!macro NSIS_HOOK_POSTUNINSTALL
  ; Tauri app data cleanup (complete user data removal)
  RMDir /r "$APPDATA\com.backscreen.app\backscreen"
  RMDir "$APPDATA\com.backscreen.app"

  ; Fallback for environments using LocalAppData
  RMDir /r "$LOCALAPPDATA\com.backscreen.app\backscreen"
  RMDir "$LOCALAPPDATA\com.backscreen.app"
!macroend
