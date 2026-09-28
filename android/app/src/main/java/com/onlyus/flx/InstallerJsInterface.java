package com.onlyus.flx;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/** WebView JS bridge: window.OnlyUsInstaller.installApk(...) */
public class InstallerJsInterface {
    private final MainActivity activity;

    public InstallerJsInterface(MainActivity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void installApk(String fileName, String path, String uri) {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                File file = resolveApk(fileName, path, uri);
                if (file == null || !file.exists() || file.length() < 1024) {
                    toast("安装包未找到，请重新下载");
                    return;
                }
                String err = launch(file);
                if (err != null) {
                    toast("安装失败：" + err);
                }
            } catch (Exception e) {
                toast("安装失败：" + e.getMessage());
            }
        });
    }

    @JavascriptInterface
    public boolean canInstall() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true;
        try {
            return activity.getPackageManager().canRequestPackageInstalls();
        } catch (Exception e) {
            return true;
        }
    }

    @JavascriptInterface
    public void openInstallSettings() {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                settings.setData(Uri.parse("package:" + activity.getPackageName()));
                settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(settings);
            } catch (Exception e) {
                try {
                    activity.startActivity(new Intent(Settings.ACTION_SECURITY_SETTINGS));
                } catch (Exception ignored) {}
            }
        });
    }

    private void toast(String msg) {
        try {
            android.widget.Toast.makeText(activity, msg, android.widget.Toast.LENGTH_LONG).show();
        } catch (Exception ignored) {}
    }

    private File resolveApk(String fileName, String path, String uriStr) {
        File file;
        if (fileName != null && fileName.length() > 0) {
            file = new File(activity.getCacheDir(), fileName);
            if (file.exists()) return file;
            file = new File(activity.getFilesDir(), fileName);
            if (file.exists()) return file;
            File ext = activity.getExternalFilesDir(null);
            if (ext != null) {
                file = new File(ext, fileName);
                if (file.exists()) return file;
                File dl = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
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
            file = new File(activity.getCacheDir(), new File(clean).getName());
            if (file.exists()) return file;
        }
        if (uriStr != null && uriStr.length() > 0 && !"native".equals(uriStr)) {
            String clean = uriStr.startsWith("file://") ? uriStr.substring(7) : uriStr;
            file = new File(clean);
            if (file.exists()) return file;
        }
        return null;
    }

    private String launch(File file) {
        Exception last = null;
        File[] candidates = new File[] {
            ensureCopy(file, activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)),
            ensureCopy(file, activity.getCacheDir()),
            file,
        };
        for (File candidate : candidates) {
            if (candidate == null || !candidate.exists()) continue;
            try {
                Uri apkUri = FileProvider.getUriForFile(
                    activity,
                    activity.getPackageName() + ".fileprovider",
                    candidate
                );
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.setClipData(ClipData.newRawUri("apk", apkUri));
                try {
                    activity.grantUriPermission("com.android.packageinstaller", apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    activity.grantUriPermission("com.google.android.packageinstaller", apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } catch (Exception ignored) {}
                activity.startActivity(intent);
                return null;
            } catch (Exception e) {
                last = e;
            }
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(Uri.fromFile(candidate), "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(intent);
                return null;
            } catch (Exception e) {
                last = e;
            }
        }
        return last != null ? last.getMessage() : "无法打开安装程序";
    }

    private File ensureCopy(File src, File dir) {
        try {
            if (dir == null) return null;
            File dst = new File(dir, src.getName());
            if (dst.getAbsolutePath().equals(src.getAbsolutePath())) return dst;
            if (!dir.exists()) dir.mkdirs();
            InputStream in = new FileInputStream(src);
            OutputStream out = new FileOutputStream(dst);
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            out.close();
            in.close();
            return dst.exists() ? dst : null;
        } catch (Exception e) {
            return null;
        }
    }
}
