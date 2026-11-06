import os
import re
import sys
from pathlib import Path

def patch_installer(installer_path: Path):
    repo = os.environ.get("GITHUB_REPOSITORY", "2-sa/Vencord")
    release_api = os.environ.get("RELEASE_API", f"https://api.github.com/repos/{repo}/releases/latest")

    # 1. Point installer at ArabicUI releases
    constants_file = installer_path / "constants.go"
    if constants_file.exists():
        c_text = constants_file.read_text(encoding="utf-8")
        c_text = c_text.replace(
            'const ReleaseUrl = "https://api.github.com/repos/Vendicated/Vencord/releases/latest"',
            f'const ReleaseUrl = "{release_api}"',
        )
        c_text = c_text.replace(
            'const ReleaseUrlFallback = "https://vencord.dev/releases/vencord"',
            f'const ReleaseUrlFallback = "{release_api}"',
        )
        constants_file.write_text(c_text, encoding="utf-8")
        print(f"Patched {constants_file} -> {release_api}")

    # 2. Fix BaseDir calculation for Windows: use os.UserConfigDir() instead of XDG_CONFIG_HOME / HOME
    patcher_file = installer_path / "patcher.go"
    if patcher_file.exists():
        p_text = patcher_file.read_text(encoding="utf-8")
        pattern = r'configDir := os\.Getenv\("XDG_CONFIG_HOME"\)\s*if configDir == "" \{\s*configDir = filepath\.Join\(os\.Getenv\("HOME"\), "\.config"\)\s*\}'
        replacement = '''configDir, err := os.UserConfigDir()
\t\tif err != nil || configDir == "" {
\t\t\tconfigDir = os.Getenv("XDG_CONFIG_HOME")
\t\t\tif configDir == "" {
\t\t\t\tconfigDir = filepath.Join(os.Getenv("HOME"), ".config")
\t\t\t}
\t\t}'''
        new_p_text = re.sub(pattern, replacement, p_text)
        if new_p_text == p_text and "os.UserConfigDir()" not in p_text:
            raise RuntimeError(f"Could not patch {patcher_file}: pattern not found")
        patcher_file.write_text(new_p_text, encoding="utf-8")
        print(f"Patched {patcher_file} with os.UserConfigDir() fix")

if __name__ == "__main__":
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "installer")
    patch_installer(target)
