import fetch from 'node-fetch';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const getVideoUrl = async () => {
  const res = await fetch(process.env.SHEET_API_URL + '?fn=get');
  const data = await res.json();
  return data.url;
};

const downloadVideo = async (url) => {
  const res = await fetch(url);
  const buffer = await res.buffer();
  const filePath = path.resolve('./video.mp4');
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

const uploadToYouTube = async (filePath) => {
  const auth = new google.auth.OAuth2(
    process.env.YT_CLIENT_ID,
    process.env.YT_CLIENT_SECRET,
    process.env.YT_REDIRECT_URI
  );

  auth.setCredentials({
    refresh_token: process.env.YT_REFRESH_TOKEN
  });

  const youtube = google.youtube({ version: 'v3', auth });

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: 'On My Way #shorts',
        description: '#shorts',
        tags: ['shorts'],
        categoryId: '22'
      },
      status: {
        privacyStatus: 'public'
      }
    },
    media: {
      body: fs.createReadStream(filePath)
    }
  });

  console.log('✅ Uploaded video ID:', res.data.id);
};

const deleteRemoteVideo = async () => {
  const apiUrl = process.env.SHEET_API_URL + '?fn=delete';
  const res = await fetch(apiUrl);
  const text = await res.text();
  console.log("🧹 Delete response:", text);
};

const main = async () => {
  console.log("🚀 Starting process...");
  const SHEET_API_URL = process.env.SHEET_API_URL;
  console.log("🔍 SHEET_API_URL:", SHEET_API_URL);

  let url;
  try {
    url = await getVideoUrl();
  } catch (err) {
    console.error("❌ Failed to fetch video URL:", err.message);
    return;
  }

  // ✅ หยุดทำงานทันทีถ้าไม่ได้ลิงก์
  if (!url || !url.startsWith("http")) {
    console.log("❌ No video to upload. Exiting...");
    return;
  }

  console.log("📥 Video URL:", url);
  const videoPath = await downloadVideo(url);
  console.log("📁 Video downloaded to:", videoPath);

  try {
    console.log("📤 Uploading to YouTube...");
    await uploadToYouTube(videoPath);
  } catch (err) {
    console.error("❌ Failed to upload to YouTube:", err.message);
    return;
  }

  console.log("🧹 Deleting video from Google Drive...");
  await deleteRemoteVideo();
};


main();
