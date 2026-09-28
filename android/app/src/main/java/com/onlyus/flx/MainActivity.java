package com.onlyus.flx;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            registerPlugin(UpdateInstallerPlugin.class);
        } catch (Throwable ignored) {}
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().addJavascriptInterface(new InstallerJsInterface(this), "OnlyUsInstaller");
                getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
            }
        } catch (Throwable ignored) {}
    }
}
