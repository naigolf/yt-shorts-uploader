import fetch from 'node-fetch';
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';

// ✅ ดึง URL วิดีโอจาก API (เช่น Apps Script)
const getVideoUrl = async () => {
  try {
    const res = await fetch(process.env.SHEET_API_URL);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();
    if (!data.url || !data.url.startsWith("http")) {
      throw new Error("Invalid video URL from API");
    }
    return data.url;
  } catch (err) {
    throw new Error(`Failed to fetch video URL: ${err.message}`);
  }
};

// ✅ ดาวน์โหลดวิดีโอจาก URL ที่ได้มา
const downloadVideo = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buffer = await res.buffer();
    const filePath = path.resolve('video.mp4');
    await fs.writeFile(filePath, buffer);
    return filePath;
  } catch (err) {
    throw new Error(`Failed to download video: ${err.message}`);
  }
};

// ✅ อัปโหลดวิดีโอไปยัง YouTube
const uploadToYouTube = async (filePath) => {
  try {
    const auth = new google.auth.OAuth2(
      process.env.YT_CLIENT_ID,
      process.env.YT_CLIENT_SECRET,
      process.env.YT_REDIRECT_URI
    );

    auth.setCredentials({
      access_token: process.env.YT_ACCESS_TOKEN,
      refresh_token: process.env.YT_REFRESH_TOKEN,
    });

    const youtube = google.youtube({ version: 'v3', auth });

    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: 'Auto Uploaded Shorts',
          description: 'Uploaded automatically by GitHub Actions',
          tags: ['shorts'],
          categoryId: '22',
        },
        status: {
          privacyStatus: 'public',
        }
      },
      media: {
        body: (await import('fs')).createReadStream(filePath),
      }
    });

    console.log('✅ Uploaded video ID:', res.data.id);
  } catch (err) {
    throw new Error(`Failed to upload to YouTube: ${err.message}`);
  }
};

// ✅ รวมทุกอย่าง
const main = async () => {
  console.log("🚀 Starting process...");

  try {
    const url = await getVideoUrl();
    console.log("📥 Video URL:", url);

    const filePath = await downloadVideo(url);
    console.log("📁 Video downloaded to:", filePath);

    await uploadToYouTube(filePath);
    console.log("🎉 Upload completed!");

  } catch (err) {
    console.error("❌", err.message);
  }
};

main();
