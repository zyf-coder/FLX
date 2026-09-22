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
            String path = call.getString("path");
            String uriStr = call.getString("uri");
            File file = null;
            if (path != null && path.length() > 0) {
                String clean = path.startsWith("file://") ? path.substring(7) : path;
                file = new File(clean);
                if (!file.exists()) file = null;
            }
            if (file == null && uriStr != null && uriStr.startsWith("file://")) {
                file = new File(uriStr.substring(7));
            }
            if (file == null || !file.exists()) {
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
            getActivity().startActivity(intent);
            JSObject data = new JSObject();
            data.put("started", true);
            call.resolve(data);
        } catch (Exception e) {
            call.reject("install failed: " + e.getMessage(), e);
        }
    }
}
