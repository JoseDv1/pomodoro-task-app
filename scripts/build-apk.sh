#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export PATH="$HOME/.bun/bin:$HOME/.jdks/jdk-17/bin:$HOME/.local/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:$PATH"

if [[ -d "$HOME/Android/Sdk/build-tools" ]]; then
  SDK_DIR="$HOME/Android/Sdk"
else
  SDK_DIR="${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}"
fi

BUILD_TOOLS_DIR="$(ls -d "$SDK_DIR"/build-tools/* | sort -V | tail -n 1)"
PLATFORM_JAR="$(ls "$SDK_DIR"/platforms/android-*/android.jar | sort -V | tail -n 1)"

AAPT2="$BUILD_TOOLS_DIR/aapt2"
D8="$BUILD_TOOLS_DIR/d8"
ZIPALIGN="$BUILD_TOOLS_DIR/zipalign"
APKSIGNER="$BUILD_TOOLS_DIR/apksigner"

echo "==> [1/6] Compilando frontend Svelte 5 (vite build)..."
bun run build

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

mkdir -p "$WORK_DIR/compiled_res" \
         "$WORK_DIR/gen" \
         "$WORK_DIR/classes" \
         "$WORK_DIR/dex" \
         "$WORK_DIR/assets/www" \
         "$ROOT_DIR/android/res/mipmap-xxxhdpi" \
         "$ROOT_DIR/build"

cp "$ROOT_DIR/public/imgs/icons/tomato.png" "$ROOT_DIR/android/res/mipmap-xxxhdpi/ic_launcher.png"
cp -r "$ROOT_DIR/dist/"* "$WORK_DIR/assets/www/"
rm -rf "$WORK_DIR/assets/www/imgs/screenshots" "$WORK_DIR/assets/www/sounds"

echo "==> [2/6] Compilando y enlazando recursos Android (aapt2)..."
"$AAPT2" compile --dir "$ROOT_DIR/android/res" -o "$WORK_DIR/compiled_res/res.zip"

"$AAPT2" link \
  -I "$PLATFORM_JAR" \
  --manifest "$ROOT_DIR/android/AndroidManifest.xml" \
  -A "$WORK_DIR/assets" \
  -R "$WORK_DIR/compiled_res/res.zip" \
  --java "$WORK_DIR/gen" \
  --auto-add-overlay \
  -o "$WORK_DIR/unaligned.apk"

echo "==> [3/6] Compilando código nativo Android (javac -> d8)..."
find "$ROOT_DIR/android/src" "$WORK_DIR/gen" -name "*.java" > "$WORK_DIR/sources.txt"

javac \
  --release 11 \
  -encoding UTF-8 \
  -classpath "$PLATFORM_JAR" \
  -d "$WORK_DIR/classes" \
  @"$WORK_DIR/sources.txt"

find "$WORK_DIR/classes" -name "*.class" > "$WORK_DIR/classes.txt"
"$D8" \
  --lib "$PLATFORM_JAR" \
  --min-api 24 \
  --release \
  --output "$WORK_DIR/dex" \
  $(cat "$WORK_DIR/classes.txt")

echo "==> [4/6] Empaquetando classes.dex y alineando (zipalign)..."
(
  cd "$WORK_DIR/dex"
  jar uf "$WORK_DIR/unaligned.apk" classes.dex
)

"$ZIPALIGN" -f -p 4 "$WORK_DIR/unaligned.apk" "$WORK_DIR/aligned.apk"

KEYSTORE="$ROOT_DIR/android/release-key.jks"
if [[ ! -f "$KEYSTORE" ]]; then
  echo "==> [5/6] Generando keystore de firma Android..."
  keytool -genkeypair \
    -v \
    -keystore "$KEYSTORE" \
    -alias pomodoro \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass pomodoro123 \
    -keypass pomodoro123 \
    -dname "CN=Pomodoro Focus, OU=Mobile, O=PomodoroTaskApp, L=Bogota, S=DC, C=CO" >/dev/null 2>&1
fi

OUT_APK="$ROOT_DIR/build/PomodoroTaskApp.apk"
echo "==> [6/6] Firmando APK (Esquemas v1 + v2 + v3) y verificando..."
"$APKSIGNER" sign \
  --ks "$KEYSTORE" \
  --ks-key-alias pomodoro \
  --ks-pass pass:pomodoro123 \
  --key-pass pass:pomodoro123 \
  --out "$OUT_APK" \
  "$WORK_DIR/aligned.apk"

"$APKSIGNER" verify --verbose "$OUT_APK" >/dev/null

echo "✅ APK generado exitosamente: $OUT_APK ($(du -h "$OUT_APK" | cut -f1))"
