package com.alhikam.earsip;

import android.os.Bundle;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge layout & LAYOUT_STABLE: window never resizes or jolts when bars toggle
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            // Fullscreen by default
            controller.hide(WindowInsetsCompat.Type.systemBars());
            // Transient overlay on swipe: system bars overlay on top without resizing the app window!
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
    }
}
