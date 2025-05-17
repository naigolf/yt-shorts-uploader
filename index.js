import fetch from 'node-fetch';
import { google } from 'googleapis';
import fs from 'fs';

const getVideoUrl = async () => {
  const res = await fetch(process.env.SHEET_API_URL);
  const data = await res.json();
  return data.url;
};

const downloadVideo = async (url) => {
  const res = await fetch(url);
  const buffer = await res.buffer();
  fs.writeFileSync('video.mp4', buffer);
  return 'video.mp4';
};

const uploadToYouTube = async (filePath) => {
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
        description: 'Uploaded automatically',
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

const main = async () => {
  const url = await getVideoUrl();
  if (!url) return console.log("❌ No video URL found.");

  const videoPath = await downloadVideo(url);
  await uploadToYouTube(videoPath);
};

main();