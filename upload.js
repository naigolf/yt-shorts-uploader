import fetch from 'node-fetch';
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';

const VIDEO_FILE = 'video.mp4';

const getVideoUrl = async () => {
  try {
    const res = await fetch(process.env.SHEET_API_URL);
    const data = await res.json();
    if (!data?.url) throw new Error("❌ No 'url' field in API response.");
    return data.url;
  } catch (err) {
    console.error("❌ Failed to fetch video URL:", err.message);
    return null;
  }
};

const downloadVideo = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buffer = await res.arrayBuffer();
    await fs.writeFile(VIDEO_FILE, Buffer.from(buffer));
    return VIDEO_FILE;
  } catch (err) {
    console.error("❌ Failed to download video:", err.message);
    return null;
  }
};

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
          description: 'Uploaded automatically via GitHub Actions',
          tags: ['shorts'],
          categoryId: '22',
        },
        status: {
          privacyStatus: 'public',
        },
      },
      media: {
        body: (await import('fs')).createReadStream(filePath),
      },
    });

    console.log('✅ Uploaded video ID:', res.data.id);
  } catch (err) {
    console.error('❌ Upload to YouTube failed:', err.message);
  }
};

const main = async () => {
  console.log("🚀 Starting process...");
  const url = await getVideoUrl();
  if (!url) return;

  const videoPath = await downloadVideo(url);
  if (!videoPath) return;

  await uploadToYouTube(videoPath);

  // ลบไฟล์หลังอัปโหลด
  await fs.unlink(videoPath);
  console.log("🧹 Temporary video file deleted.");
};

main();
