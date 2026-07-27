# Silver ERP Android App

This is a native Android WebView wrapper for the hosted Silver ERP. It supports JavaScript, LocalStorage, and file/image selection from the ERP entry form.

## Build APK

1. Host the `SilverERP` web folder on an HTTPS URL.
2. In `app/src/main/java/com/silvererp/app/AppConfig.kt`, replace `https://YOUR-HOSTED-SILVER-ERP-URL` with the deployed website URL.
3. Open this `android` folder in Android Studio.
4. Select **Build → Build APK(s)**.
5. Install `app-debug.apk` on the Android device.

The app needs the hosted ERP URL for common cloud data. Do not point it to a local computer file path.
