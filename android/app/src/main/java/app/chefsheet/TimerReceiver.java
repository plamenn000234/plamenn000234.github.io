package app.chefsheet;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

/** Kitchen timers that ring when the app is in the background or the screen is off. */
public class TimerReceiver extends BroadcastReceiver {

    static final String CHANNEL = "timers";
    static final String ACTION = "app.chefsheet.TIMER";

    static int code(String id) { return id.hashCode() & 0x7fffffff; }

    static PendingIntent pending(Context c, String id, String label) {
        Intent i = new Intent(c, TimerReceiver.class).setAction(ACTION).putExtra("id", id).putExtra("label", label);
        return PendingIntent.getBroadcast(c, code(id), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void schedule(Context c, String id, long endAt, String label) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = pending(c, id, label);
        if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, pi);
        } else {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, pi);
        }
    }

    static void cancel(Context c, String id) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        am.cancel(pending(c, id, ""));
        ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(code(id));
    }

    static void channel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Kitchen timers", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Rings when a recipe timer is done");
        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        ch.setSound(sound, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 400, 150, 400, 150, 800});
        nm.createNotificationChannel(ch);
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        String id = intent.getStringExtra("id");
        String label = intent.getStringExtra("label");
        if (id == null) return;
        channel(c);
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tap = PendingIntent.getActivity(c, code(id), open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CHANNEL) : new Notification.Builder(c);
        b.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("Time is up")
                .setContentText(label == null || label.isEmpty() ? "Kitchen timer" : label)
                .setCategory(Notification.CATEGORY_ALARM)
                .setPriority(Notification.PRIORITY_MAX)
                .setDefaults(Notification.DEFAULT_ALL)
                .setAutoCancel(true)
                .setContentIntent(tap);
        Notification n = b.build();
        n.flags |= Notification.FLAG_INSISTENT;
        try {
            ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(code(id), n);
        } catch (SecurityException e) {
            // notifications not allowed by the user
        }
    }
}
