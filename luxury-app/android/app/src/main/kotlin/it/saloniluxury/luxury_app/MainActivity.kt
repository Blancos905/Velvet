package it.saloniluxury.luxury_app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        ensureLuxuryNotificationChannel()
        super.onCreate(savedInstanceState)
    }

    /** Canale richiesto su Android 8+ affinché FCM mostri le push in tray. */
    private fun ensureLuxuryNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java) ?: return
        val channelId = getString(R.string.luxury_fcm_channel_id)
        if (manager.getNotificationChannel(channelId) != null) return
        val channel = NotificationChannel(
            channelId,
            getString(R.string.luxury_fcm_channel_name),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = getString(R.string.luxury_fcm_channel_description)
            enableVibration(true)
            setShowBadge(true)
        }
        manager.createNotificationChannel(channel)
    }
}
