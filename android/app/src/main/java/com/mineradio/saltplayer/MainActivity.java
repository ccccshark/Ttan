package com.mineradio.saltplayer;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.app.Activity;
import android.view.WindowManager;
import android.os.Build;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 沉浸式全屏 - 沉浸式听歌体验
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        );
        // 保持屏幕常亮选项由 Web 端控制，这里不强制
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            // 沉浸式状态栏与导航栏
            View decorView = getWindow().getDecorView();
            int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
            decorView.setSystemUiVisibility(flags);
        }
    }

    @Override
    protected void onPostCreate(Bundle savedInstanceState) {
        super.onPostCreate(savedInstanceState);

        // 配置 WebView 允许文件访问、媒体自动播放
        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            // 允许 file:// 协议访问（用于读取本机音频）
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            // 媒体自动播放（无需用户交互）
            settings.setMediaPlaybackRequiresUserGesture(false);
            // 启用 DOM storage 与 IndexedDB
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            // 启用硬件加速
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            // 启用混合模式（文件 + https）
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            }
        }
    }
}
