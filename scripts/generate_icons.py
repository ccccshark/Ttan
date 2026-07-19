#!/usr/bin/env python3
"""生成应用图标与启动屏 PNG 资源"""
from PIL import Image, ImageDraw, ImageFilter
import os

ANDROID = "/workspace/android/app/src/main/res"

# 暖橘红主题色
ORANGE_LIGHT = (255, 131, 85, 255)   # #FF8355
ORANGE_DARK = (237, 79, 24, 255)     # #ED4F18
DEEP_SPACE = (5, 6, 15, 255)         # #05060F

def make_gradient_bg(size, color_top, color_bottom, vertical=True):
    """生成渐变背景"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pixels = img.load()
    for y in range(size):
        for x in range(size):
            t = (y / size) if vertical else ((x + y) / (2 * size))
            r = int(color_top[0] + (color_bottom[0] - color_top[0]) * t)
            g = int(color_top[1] + (color_bottom[1] - color_top[1]) * t)
            b = int(color_top[2] + (color_bottom[2] - color_top[2]) * t)
            pixels[x, y] = (r, g, b, 255)
    return img

def draw_music_note(img, color=(255, 255, 255, 255), scale=1.0):
    """在 img 中心绘制简化音符：两条竖线 + 两个圆点 + 连接横线"""
    w, h = img.size
    cx, cy = w / 2, h / 2
    # 缩放后的尺寸
    note_h = int(h * 0.42 * scale)   # 整体高度
    note_w = int(w * 0.32 * scale)   # 整体宽度
    stem_w = max(2, int(w * 0.025 * scale))
    dot_r = int(w * 0.075 * scale)

    draw = ImageDraw.Draw(img)

    # 两条竖线（音符的 stem）
    left_x = int(cx - note_w / 2 + dot_r)
    right_x = int(cx + note_w / 2 - dot_r)
    top_y = int(cy - note_h / 2 + dot_r)
    bot_y = int(cy + note_h / 2 - dot_r)

    draw.line([(left_x, top_y), (left_x, bot_y)], fill=color, width=stem_w)
    draw.line([(right_x, top_y), (right_x, bot_y)], fill=color, width=stem_w)

    # 顶部连接横线（flag）
    flag_w = max(3, int(w * 0.04 * scale))
    draw.line([(left_x, top_y), (right_x, top_y)], fill=color, width=flag_w)
    # 第二条横线（八分音符）
    second_y = top_y + int(note_h * 0.22)
    draw.line([(left_x, second_y), (right_x, second_y)], fill=color, width=flag_w)

    # 两个底部圆点（note head）
    draw.ellipse(
        [left_x - dot_r, bot_y - dot_r, left_x + dot_r, bot_y + dot_r],
        fill=color
    )
    draw.ellipse(
        [right_x - dot_r, bot_y - dot_r, right_x + dot_r, bot_y + dot_r],
        fill=color
    )

def make_icon(size, with_bg=True, with_round_mask=False):
    """生成图标"""
    if with_bg:
        img = make_gradient_bg(size, ORANGE_LIGHT, ORANGE_DARK, vertical=False)
    else:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_music_note(img, scale=0.85)

    if with_round_mask:
        # 圆形遮罩
        mask = Image.new("L", (size, size), 0)
        md = ImageDraw.Draw(mask)
        md.ellipse([0, 0, size - 1, size - 1], fill=255)
        result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        result.paste(img, (0, 0), mask)
        return result
    return img

def make_splash(width, height):
    """生成启动屏：深空背景 + 中心橘色音符"""
    img = Image.new("RGBA", (width, height), DEEP_SPACE)
    # 中心一个橘色圆 + 白色音符
    cx, cy = width // 2, height // 2
    r = min(width, height) // 6
    # 圆形橘红渐变背景
    bg = make_gradient_bg(r * 2, ORANGE_LIGHT, ORANGE_DARK, vertical=False)
    # 圆形遮罩
    mask = Image.new("L", (r * 2, r * 2), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([0, 0, r * 2 - 1, r * 2 - 1], fill=255)
    img.paste(bg, (cx - r, cy - r), mask)

    # 在橘色圆上绘制白色音符（缩小）
    # 复制圆区为单独图层
    overlay = Image.new("RGBA", (r * 2, r * 2), (0, 0, 0, 0))
    overlay.paste(img.crop((cx - r, cy - r, cx + r, cy + r)), (0, 0))
    draw_music_note(overlay, scale=1.6)
    img.paste(overlay, (cx - r, cy - r), overlay)

    # 应用名（橘色文字）
    return img

# mipmap 密度对应的尺寸
DENSITIES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# 1. 生成 ic_launcher.png（方形）
for folder, size in DENSITIES.items():
    path = f"{ANDROID}/{folder}/ic_launcher.png"
    img = make_icon(size, with_bg=True, with_round_mask=False)
    img.save(path, "PNG")
    print(f"Saved {path} ({size}x{size})")

# 2. 生成 ic_launcher_round.png（圆形）
for folder, size in DENSITIES.items():
    path = f"{ANDROID}/{folder}/ic_launcher_round.png"
    img = make_icon(size, with_bg=True, with_round_mask=True)
    img.save(path, "PNG")
    print(f"Saved {path} ({size}x{size})")

# 3. 生成 ic_launcher_foreground.png（透明背景的音符，用于自适应图标）
for folder, size in DENSITIES.items():
    path = f"{ANDROID}/{folder}/ic_launcher_foreground.png"
    # 自适应图标前景需要 108dp 总尺寸，中心 72dp 安全区
    # 这里按比例放大
    fg_size = int(size * 108 / 48) if folder != "mipmap-mdpi" else size * 2
    img = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
    draw_music_note(img, scale=1.3)
    img.save(path, "PNG")
    print(f"Saved {path} ({fg_size}x{fg_size})")

# 4. 生成 splash 启动屏（横屏与竖屏，各密度）
SPLASH_DENSITIES = {
    "mdpi": (320, 480),
    "hdpi": (480, 800),
    "xhdpi": (720, 1280),
    "xxhdpi": (1080, 1920),
    "xxxhdpi": (1440, 2560),
}

for density, (w, h) in SPLASH_DENSITIES.items():
    # 竖屏
    img = make_splash(w, h)
    path = f"{ANDROID}/drawable-port-{density}/splash.png"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG")
    print(f"Saved {path} ({w}x{h})")
    # 横屏
    img_l = make_splash(h, w)
    path_l = f"{ANDROID}/drawable-land-{density}/splash.png"
    os.makedirs(os.path.dirname(path_l), exist_ok=True)
    img_l.save(path_l, "PNG")
    print(f"Saved {path_l} ({h}x{w})")

# 5. 默认 drawable 下的 splash
img = make_splash(1080, 1920)
img.save(f"{ANDROID}/drawable/splash.png", "PNG")
print(f"Saved {ANDROID}/drawable/splash.png")

print("\nAll icons and splash screens generated!")
