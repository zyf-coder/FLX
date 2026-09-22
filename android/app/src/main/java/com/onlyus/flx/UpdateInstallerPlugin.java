package com.onlyus.flx;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "UpdateInstaller")
public class UpdateInstallerPlugin extends Plugin {

    @PluginMethod
    public void install(PluginCall call) {
        try {
            if (needsInstallPermission()) {
                openUnknownSourcesSettings();
                resolveOnMain(call, error("NEED_INSTALL_PERMISSION", "need install permission"), true);
                return;
            }
            File file = resolveApk(
                call.getString("fileName"),
                call.getString("path"),
                call.getString("uri")
            );
            if (file == null || !file.exists() || file.length() < 1024) {
                resolveOnMain(
                    call,
                    error("APK_MISSING", "APK file not found: " + safeListCache()),
                    true
                );
                return;
            }
            String result = launchInstaller(file);
            if (result != null) {
                resolveOnMain(call, error("LAUNCH_FAILED", result), true);
                return;
            }
            JSObject data = new JSObject();
            data.put("started", true);
            data.put("path", file.getAbsolutePath());
            data.put("size", file.length());
            resolveOnMain(call, data, false);
        } catch (Exception e) {
            resolveOnMain(call, error("INSTALL_EXCEPTION", e.getMessage() != null ? e.getMessage() : e.toString()), true);
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        final String url = call.getString("url");
        final String fileName = call.getString("fileName");
        if (url == null || url.length() == 0 || fileName == null || fileName.length() == 0) {
            resolveOnMain(call, error("BAD_ARGS", "url/fileName required"), true);
            return;
        }
        if (needsInstallPermission()) {
            openUnknownSourcesSettings();
            resolveOnMain(call, error("NEED_INSTALL_PERMISSION", "need install permission"), true);
            return;
        }
        call.setKeepAlive(true);
        new Thread(() -> {
            try {
                File target = new File(getContext().getCacheDir(), fileName);
                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(180000);
                conn.setInstanceFollowRedirects(true);
                conn.connect();
                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) {
                    resolveOnMain(call, error("DOWNLOAD_HTTP", "download failed: " + code), true);
                    return;
                }
                int total = conn.getContentLength();
                InputStream in = conn.getInputStream();
                FileOutputStream out = new FileOutputStream(target);
                byte[] buf = new byte[64 * 1024];
                long read = 0;
                int n;
                int lastPct = -1;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    read += n;
                    if (total > 0) {
                        int pct = (int) Math.min(99, (read * 100) / total);
                        if (pct != lastPct) {
                            lastPct = pct;
                            JSObject progress = new JSObject();
                            progress.put("percent", pct);
                            notifyListeners("progress", progress);
                        }
                    }
                }
                out.flush();
                out.close();
                in.close();
                conn.disconnect();
                if (target.length() < 1024) {
                    resolveOnMain(call, error("DOWNLOAD_SMALL", "downloaded file too small"), true);
                    return;
                }
                JSObject progress = new JSObject();
                progress.put("percent", 100);
                notifyListeners("progress", progress);
                String result = launchInstaller(target);
                if (result != null) {
                    resolveOnMain(call, error("LAUNCH_FAILED", result), true);
                    return;
                }
                JSObject data = new JSObject();
                data.put("started", true);
                data.put("path", target.getAbsolutePath());
                data.put("size", target.length());
                resolveOnMain(call, data, false);
            } catch (Exception e) {
                resolveOnMain(call, error("DOWNLOAD_EXCEPTION", e.getMessage() != null ? e.getMessage() : e.toString()), true);
            }
        }).start();
    }

    private JSObject error(String code, String message) {
        JSObject data = new JSObject();
        data.put("code", code);
        data.put("message", message == null ? code : message);
        return data;
    }

    private void resolveOnMain(PluginCall call, JSObject data, boolean isReject) {
        String message = data.getString("message");
        Runnable task = () -> {
            if (isReject) {
                call.reject(message == null ? "error" : message);
            } else {
                call.resolve(data);
            }
        };
        try {
            if (getActivity() != null) getActivity().runOnUiThread(task);
            else task.run();
        } catch (Exception e) {
            try {
                call.reject(e.getMessage(), e);
            } catch (Exception ignored) {}
        }
    }

    private boolean needsInstallPermission() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && !getContext().getPackageManager().canRequestPackageInstalls();
    }

    private void openUnknownSourcesSettings() {
        try {
            Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            settings.setData(Uri.parse("package:" + getContext().getPackageName()));
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settings);
        } catch (Exception e) {
            try {
                Intent settings = new Intent(Settings.ACTION_SECURITY_SETTINGS);
                settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(settings);
            } catch (Exception ignored) {}
        }
    }

    /** return null on success, or error text */
    private String launchInstaller(File file) {
        Exception last = null;
        // 1) FileProvider + ACTION_VIEW
        try {
            File shared = ensureExternalCopy(file);
            Uri apkUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                shared != null ? shared : file
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            if (getActivity() != null) getActivity().startActivity(intent);
            else getContext().startActivity(intent);
            return null;
        } catch (Exception e) {
            last = e;
        }
        // 2) cache FileProvider
        try {
            File cacheCopy = new File(getContext().getCacheDir(), file.getName());
            if (!cacheCopy.getAbsolutePath().equals(file.getAbsolutePath())) {
                copyFile(file, cacheCopy);
            }
            Uri apkUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                cacheCopy
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            if (getActivity() != null) getActivity().startActivity(intent);
            else getContext().startActivity(intent);
            return null;
        } catch (Exception e) {
            last = e;
        }
        // 3) legacy file:// (old devices)
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(Uri.fromFile(file), "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (getActivity() != null) getActivity().startActivity(intent);
            else getContext().startActivity(intent);
            return null;
        } catch (Exception e) {
            last = e;
        }
        // 4) package installer explicitly
        try {
            Intent intent = new Intent("android.intent.action.INSTALL_PACKAGE");
            intent.setData(FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            ));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            if (getActivity() != null) getActivity().startActivity(intent);
            else getContext().startActivity(intent);
            return null;
        } catch (Exception e) {
            last = e;
        }
        return last != null
            ? (last.getClass().getSimpleName() + ": " + last.getMessage())
            : "unknown installer error";
    }

    private File ensureExternalCopy(File file) {
        try {
            File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (dir == null) return null;
            File dst = new File(dir, file.getName());
            if (!dst.getAbsolutePath().equals(file.getAbsolutePath())) {
                copyFile(file, dst);
            }
            return dst.exists() ? dst : null;
        } catch (Exception e) {
            return null;
        }
    }

    private void copyFile(File src, File dst) throws Exception {
        File parent = dst.getParentFile();
        if (parent != null && !parent.exists()) parent.mkdirs();
        InputStream in = new FileInputStream(src);
        FileOutputStream out = new FileOutputStream(dst);
        byte[] buf = new byte[64 * 1024];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        out.close();
        in.close();
    }

    private File resolveApk(String fileName, String path, String uriStr) {
        File file;
        if (fileName != null && fileName.length() > 0) {
            file = new File(getContext().getCacheDir(), fileName);
            if (file.exists()) return file;
            file = new File(getContext().getFilesDir(), fileName);
            if (file.exists()) return file;
            File ext = getContext().getExternalFilesDir(null);
            if (ext != null) {
                file = new File(ext, fileName);
                if (file.exists()) return file;
                File dl = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dl != null) {
                    file = new File(dl, fileName);
                    if (file.exists()) return file;
                }
            }
        }
        if (path != null && path.length() > 0) {
            String clean = path.startsWith("file://") ? path.substring(7) : path;
            file = new File(clean);
            if (file.exists()) return file;
            file = new File(getContext().getCacheDir(), new File(clean).getName());
            if (file.exists()) return file;
        }
        if (uriStr != null && uriStr.length() > 0 && !uriStr.equals("native")) {
            String clean = uriStr.startsWith("file://") ? uriStr.substring(7) : uriStr;
            file = new File(clean);
            if (file.exists()) return file;
        }
        return null;
    }

    private String safeListCache() {
        try {
            File[] files = getContext().getCacheDir().listFiles();
            if (files == null) return "cache empty";
            StringBuilder sb = new StringBuilder();
            for (File f : files) {
                if (sb.length() > 0) sb.append(",");
                sb.append(f.getName()).append(":").append(f.length());
            }
            String can = String.valueOf(getContext().getPackageManager().canRequestPackageInstalls());
            return sb + " canInstall=" + can + " sdk=" + Build.VERSION.SDK_INT;
        } catch (Exception e) {
            return String.valueOf(e.getMessage());
        }
    }
}
