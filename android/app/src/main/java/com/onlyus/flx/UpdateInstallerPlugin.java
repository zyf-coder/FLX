package com.onlyus.flx;

import android.content.Intent;
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
                call.reject("NEED_INSTALL_PERMISSION");
                return;
            }
            File file = resolveApk(
                call.getString("fileName"),
                call.getString("path"),
                call.getString("uri")
            );
            if (file == null || !file.exists() || file.length() < 1024) {
                call.reject("APK file not found: " + safeListCache());
                return;
            }
            launchInstaller(file);
            JSObject data = new JSObject();
            data.put("started", true);
            data.put("path", file.getAbsolutePath());
            data.put("size", file.length());
            call.resolve(data);
        } catch (Exception e) {
            call.reject("install failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        final String url = call.getString("url");
        final String fileName = call.getString("fileName");
        if (url == null || url.length() == 0 || fileName == null || fileName.length() == 0) {
            call.reject("url/fileName required");
            return;
        }
        if (needsInstallPermission()) {
            openUnknownSourcesSettings();
            call.reject("NEED_INSTALL_PERMISSION");
            return;
        }
        new Thread(() -> {
            try {
                File target = new File(getContext().getCacheDir(), fileName);
                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(120000);
                conn.setInstanceFollowRedirects(true);
                conn.connect();
                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) {
                    call.reject("download failed: " + code);
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
                    call.reject("downloaded file too small");
                    return;
                }
                JSObject progress = new JSObject();
                progress.put("percent", 100);
                notifyListeners("progress", progress);
                launchInstaller(target);
                JSObject data = new JSObject();
                data.put("started", true);
                data.put("path", target.getAbsolutePath());
                data.put("size", target.length());
                call.resolve(data);
            } catch (Exception e) {
                call.reject("download/install failed: " + e.getMessage(), e);
            }
        }).start();
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
        } catch (Exception ignored) {}
    }

    private void launchInstaller(File file) throws Exception {
        Uri apkUri;
        try {
            File shared = new File(getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), file.getName());
            if (!shared.getAbsolutePath().equals(file.getAbsolutePath())) {
                copyFile(file, shared);
                file = shared;
            }
            apkUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );
        } catch (Exception e) {
            // FileProvider 不接受该路径时退回 cache
            File cacheCopy = new File(getContext().getCacheDir(), file.getName());
            if (!cacheCopy.getAbsolutePath().equals(file.getAbsolutePath())) {
                copyFile(file, cacheCopy);
                file = cacheCopy;
            }
            apkUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );
        }
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        if (getActivity() != null) {
            getActivity().startActivity(intent);
        } else {
            getContext().startActivity(intent);
        }
    }

    private void copyFile(File src, File dst) throws Exception {
        File parent = dst.getParentFile();
        if (parent != null && !parent.exists()) parent.mkdirs();
        InputStream in = new java.io.FileInputStream(src);
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
                file = new File(ext, Environment.DIRECTORY_DOWNLOADS + File.separator + fileName);
                if (file.exists()) return file;
            }
        }
        if (path != null && path.length() > 0) {
            String clean = path.startsWith("file://") ? path.substring(7) : path;
            file = new File(clean);
            if (file.exists()) return file;
            file = new File(getContext().getCacheDir(), new File(clean).getName());
            if (file.exists()) return file;
        }
        if (uriStr != null && uriStr.length() > 0) {
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
            return sb.toString();
        } catch (Exception e) {
            return e.getMessage();
        }
    }
}
