package com.mineradio.saltplayer;

import android.content.ContentResolver;
import android.content.ContentUris;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * TtanScanner - 扫描设备上的本地音乐
 *
 * 使用 Android MediaStore API 查询设备所有音频文件，
 * 适用于 Android 10+ 的 Scoped Storage。
 * 支持提取：
 * - 文件名 / 路径 / URI
 * - 内嵌封面（ID3 APIC）
 * - 时长、大小、标题、艺人、专辑
 */
@CapacitorPlugin(name = "TtanScanner")
public class TtanScannerPlugin extends Plugin {

    /**
     * 扫描全部音频文件
     * @param call { limit?: number }
     * @return { files: Array<{name, path, uri, size, duration, title, artist, album, coverBase64, coverMime}> }
     */
    @PluginMethod
    public void scanAudio(PluginCall call) {
        Integer limit = call.getInt("limit");
        try {
            JSArray result = scanAllAudio(limit != null ? limit : 0);
            JSObject ret = new JSObject();
            ret.put("files", result);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("扫描失败: " + e.getMessage(), e);
        }
    }

    private JSArray scanAllAudio(int limit) {
        JSArray arr = new JSArray();
        ContentResolver cr = getContext().getContentResolver();
        Uri collection;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            collection = MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL);
        } else {
            collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        }

        String[] projection = new String[]{
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM,
                MediaStore.Audio.Media.ALBUM_ID,
                MediaStore.Audio.Media.MIME_TYPE,
                MediaStore.Audio.Media.RELATIVE_PATH,
                MediaStore.Audio.Media.IS_MUSIC
        };

        // 仅扫描音乐，过滤掉 < 30 秒的录音、铃声
        String selection = MediaStore.Audio.Media.IS_MUSIC + " != 0";
        String[] selectionArgs = null;

        String sortOrder = MediaStore.Audio.Media.DATE_ADDED + " DESC";
        if (limit > 0) sortOrder += " LIMIT " + limit;

        Cursor cursor = cr.query(collection, projection, selection, selectionArgs, sortOrder);
        if (cursor == null) return arr;

        int idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
        int nameCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME);
        int sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE);
        int durCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
        int titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
        int artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
        int albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM);
        int albumIdCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID);
        int mimeCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE);
        int relPathCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.RELATIVE_PATH);

        int count = 0;
        try {
            while (cursor.moveToNext()) {
                long id = cursor.getLong(idCol);
                String name = cursor.getString(nameCol);
                long size = cursor.getLong(sizeCol);
                long duration = cursor.getLong(durCol);
                String title = cursor.getString(titleCol);
                String artist = cursor.getString(artistCol);
                String album = cursor.getString(albumCol);
                long albumId = cursor.getLong(albumIdCol);
                String mime = cursor.getString(mimeCol);
                String relPath = cursor.getString(relPathCol);

                Uri contentUri = ContentUris.withAppendedId(collection, id);
                String uriString = contentUri.toString();

                // 构建相对路径（可空）
                String path = relPath != null ? relPath + name : name;

                // 提取专辑封面（小尺寸加速，限制 256KB）
                String coverBase64 = null;
                String coverMime = null;
                try {
                    Uri albumArtUri = ContentUris.withAppendedId(
                            Uri.parse("content://media/external/audio/albumart"), albumId);
                    try (InputStream is = cr.openInputStream(albumArtUri)) {
                        if (is != null) {
                            ByteArrayOutputStream bos = new ByteArrayOutputStream();
                            byte[] buf = new byte[8192];
                            int n;
                            int total = 0;
                            while ((n = is.read(buf)) > 0 && total < 256 * 1024) {
                                bos.write(buf, 0, n);
                                total += n;
                            }
                            byte[] data = bos.toByteArray();
                            if (data.length > 0) {
                                coverBase64 = Base64.encodeToString(data, Base64.NO_WRAP);
                                coverMime = "image/jpeg";
                            }
                        }
                    } catch (Exception ignore) {
                        // 没有专辑封面是正常的，忽略
                    }
                } catch (Exception ignore) {
                }

                JSObject obj = new JSObject();
                obj.put("id", id);
                obj.put("name", name != null ? name : "未知");
                obj.put("path", path);
                obj.put("uri", uriString);
                obj.put("size", size);
                obj.put("duration", duration);
                obj.put("title", title != null ? title : "");
                obj.put("artist", artist != null ? artist : "");
                obj.put("album", album != null ? album : "");
                obj.put("mime", mime != null ? mime : "audio/mpeg");
                if (coverBase64 != null) {
                    obj.put("coverBase64", coverBase64);
                    obj.put("coverMime", coverMime);
                }
                arr.put(obj);
                count++;
            }
        } finally {
            cursor.close();
        }
        return arr;
    }
}
