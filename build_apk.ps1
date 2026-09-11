# Automated APK build script for Monochromeous
# Optimized for full Android 5.0 (API 21) through Android 15 (API 35) compatibility
$ErrorActionPreference = "Stop"

$sdk = "$env:LOCALAPPDATA/Android/Sdk".Replace('\', '/')
$buildTools = "$sdk/build-tools/36.0.0"
$androidJar = "$sdk/platforms/android-35/android.jar"
$aapt2 = "$buildTools/aapt2.exe"
$d8 = "$buildTools/d8.bat"
$zipalign = "$buildTools/zipalign.exe"
$apksigner = "$buildTools/apksigner.bat"

Write-Host "=== Starting Android APK Build (Monochromeous) ===" -ForegroundColor Cyan

$buildDir = "android/build"
if (Test-Path $buildDir) {
    Remove-Item $buildDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path "$buildDir/gen", "$buildDir/classes", "$buildDir/dex" | Out-Null

# 1. Compile Resources with aapt2
Write-Host "[1/7] Compiling Android Resources with aapt2..." -ForegroundColor Yellow
& $aapt2 compile --dir "android/res" -o "$buildDir/compiled_res.zip"
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

# 2. Link with aapt2 with explicit min-sdk and target-sdk versions
Write-Host "[2/7] Linking package with aapt2 (minSdkVersion 21, targetSdkVersion 34)..." -ForegroundColor Yellow
& $aapt2 link -I $androidJar `
    --manifest "android/AndroidManifest.xml" `
    --min-sdk-version 21 `
    --target-sdk-version 34 `
    -A "android/assets" `
    -o "$buildDir/unaligned.apk" `
    --java "$buildDir/gen" `
    "$buildDir/compiled_res.zip" `
    --auto-add-overlay
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed" }

# 3. Compile Java Source Files
Write-Host "[3/7] Compiling Java sources with javac..." -ForegroundColor Yellow
$javaSources = @(
    "$buildDir/gen/com/theentity/monochromehorror/R.java",
    "android/src/com/theentity/monochromehorror/MainActivity.java"
)
javac --release 8 `
    -cp $androidJar `
    -d "$buildDir/classes" `
    $javaSources
if ($LASTEXITCODE -ne 0) { throw "javac failed" }

# 4. Dex bytecode with d8 (min-api 21)
Write-Host "[4/7] Converting bytecode to DEX with d8 (min-api 21)..." -ForegroundColor Yellow
$classFiles = Get-ChildItem "$buildDir/classes/com/theentity/monochromehorror/*.class" | Select-Object -ExpandProperty FullName
& $d8 $classFiles --min-api 21 --output "$buildDir/dex" --lib $androidJar
if ($LASTEXITCODE -ne 0) { throw "d8 failed" }

# 5. Add classes.dex into unaligned.apk using official jar tool
Write-Host "[5/7] Adding classes.dex to APK package..." -ForegroundColor Yellow
jar -uf "$buildDir/unaligned.apk" -C "$buildDir/dex" "classes.dex"
if ($LASTEXITCODE -ne 0) { throw "Adding classes.dex failed" }

# 6. Align APK with zipalign (4-byte alignment)
Write-Host "[6/7] Aligning APK with zipalign..." -ForegroundColor Yellow
$alignedApk = "Monochromeous.apk"
if (Test-Path $alignedApk) { Remove-Item $alignedApk -Force }
& $zipalign -p -f 4 "$buildDir/unaligned.apk" $alignedApk
if ($LASTEXITCODE -ne 0) { throw "zipalign failed" }

# 7. Sign APK with apksigner (v1 + v2 + v3 signatures)
Write-Host "[7/7] Signing APK with apksigner..." -ForegroundColor Yellow
$keystore = "debug.keystore"
if (-not (Test-Path $keystore)) {
    Write-Host "Generating debug keystore..." -ForegroundColor Cyan
    keytool -genkey -v -keystore $keystore -alias androiddebugkey -storepass android -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
}

& $apksigner sign --ks $keystore `
    --ks-pass "pass:android" `
    --key-pass "pass:android" `
    --min-sdk-version 21 `
    --v1-signing-enabled true `
    --v2-signing-enabled true `
    --v3-signing-enabled true `
    $alignedApk
if ($LASTEXITCODE -ne 0) { throw "apksigner failed" }

Write-Host "`nVerifying APK signature and compatibility..." -ForegroundColor Cyan
& $apksigner verify --verbose $alignedApk
if ($LASTEXITCODE -ne 0) { throw "apksigner verify failed" }

Write-Host "`nSUCCESS! APK built and signed successfully: $alignedApk" -ForegroundColor Green
Get-Item $alignedApk | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
