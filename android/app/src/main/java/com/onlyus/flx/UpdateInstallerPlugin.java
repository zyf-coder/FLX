package com.onlyus.flx;

import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "UpdateInstaller")
public class UpdateInstallerPlugin extends Plugin {
    @PluginMethod
    public void install(PluginCall call) {
        try {
            String fileName = call.getString("fileName");
            String path = call.getString("path");
            String uriStr = call.getString("uri");
            File file = resolveApk(fileName, path, uriStr);
            if (file == null || !file.exists() || file.length() < 1024) {
                call.reject("APK file not found");
                return;
            }
            Uri apkUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            if (getActivity() != null) {
                getActivity().startActivity(intent);
            } else {
                getContext().startActivity(intent);
            }
            JSObject data = new JSObject();
            data.put("started", true);
            data.put("path", file.getAbsolutePath());
            data.put("size", file.length());
            call.resolve(data);
        } catch (Exception e) {
            call.reject("install failed: " + e.getMessage(), e);
        }
    }

    private File resolveApk(String fileName, String path, String uriStr) {
        File file = null;
        if (fileName != null && fileName.length() > 0) {
            file = new File(getContext().getCacheDir(), fileName);
            if (file.exists()) return file;
            file = new File(getContext().getFilesDir(), fileName);
            if (file.exists()) return file;
            File external = getContext().getExternalFilesDir(null);
            if (external != null) {
                file = new File(external, fileName);
                if (file.exists()) return file;
            }
        }
        if (path != null && path.length() > 0) {
            String clean = path.startsWith("file://") ? path.substring(7) : path;
            file = new File(clean);
            if (file.exists()) return file;
            // path 有时只带文件名
            file = new File(getContext().getCacheDir(), new File(clean).getName());
            if (file.exists()) return file;
        }
        if (uriStr != null && uriStr.length() > 0) {
            String clean = uriStr.startsWith("file://") ? uriStr.substring(7) : uriStr;
            file = new File(clean);
            if (file.exists()) return file;
            file = new File(getContext().getCacheDir(), new File(clean).getName());
            if (file.exists()) return file;
        }
        return null;
    }
}
