import { describe, it, expect } from "vitest";
import { parseLrc, findCurrentLyricIndex } from "../lyrics";
import { formatTime, formatFileSize, formatCount, stripExtension } from "../format";

describe("parseLrc", () => {
  it("parses standard LRC format", () => {
    const lrc = `[00:01.00]第一行
[00:03.50]第二行
[00:05.00]第三行`;
    const lines = parseLrc(lrc);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual({ time: 1, text: "第一行" });
    expect(lines[1]).toEqual({ time: 3.5, text: "第二行" });
    expect(lines[2]).toEqual({ time: 5, text: "第三行" });
  });

  it("handles multiple timestamps on one line", () => {
    const lrc = `[00:01.00][00:05.00]重复行`;
    const lines = parseLrc(lrc);
    expect(lines).toHaveLength(2);
    expect(lines[0].time).toBe(1);
    expect(lines[1].time).toBe(5);
    expect(lines[0].text).toBe("重复行");
  });

  it("handles missing milliseconds", () => {
    const lines = parseLrc("[00:10]foo");
    expect(lines[0]).toEqual({ time: 10, text: "foo" });
  });

  it("sorts lines by time", () => {
    const lines = parseLrc("[00:05.00]b\n[00:01.00]a");
    expect(lines[0].text).toBe("a");
    expect(lines[1].text).toBe("b");
  });

  it("returns empty for empty input", () => {
    expect(parseLrc("")).toEqual([]);
  });
});

describe("findCurrentLyricIndex", () => {
  const lines = parseLrc("[00:01.00]a\n[00:03.00]b\n[00:05.00]c");

  it("returns -1 before first line", () => {
    expect(findCurrentLyricIndex(lines, 0.5)).toBe(-1);
  });

  it("returns index of matching line", () => {
    expect(findCurrentLyricIndex(lines, 1)).toBe(0);
    expect(findCurrentLyricIndex(lines, 3)).toBe(1);
    expect(findCurrentLyricIndex(lines, 5)).toBe(2);
  });

  it("returns last passed line for intermediate times", () => {
    expect(findCurrentLyricIndex(lines, 2)).toBe(0);
    expect(findCurrentLyricIndex(lines, 4.9)).toBe(1);
  });

  it("returns last index after end", () => {
    expect(findCurrentLyricIndex(lines, 99)).toBe(2);
  });
});

describe("formatTime", () => {
  it("formats seconds as m:ss", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(125)).toBe("2:05");
  });

  it("handles edge cases", () => {
    expect(formatTime(-1)).toBe("0:00");
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime(Infinity)).toBe("0:00");
  });
});

describe("formatFileSize", () => {
  it("formats bytes correctly", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });
});

describe("formatCount", () => {
  it("formats small numbers as-is", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
  });

  it("formats large numbers as k", () => {
    expect(formatCount(1200)).toBe("1.2k");
  });
});

describe("stripExtension", () => {
  it("removes file extension", () => {
    expect(stripExtension("song.mp3")).toBe("song");
    expect(stripExtension("my.song.flac")).toBe("my.song");
    expect(stripExtension("noext")).toBe("noext");
  });
});
