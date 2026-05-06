import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { AwsClient } from 'aws4fetch';

const app = express();
const PORT = 3000;

app.use(express.json());

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const aws = new AwsClient({
  accessKeyId: R2_ACCESS_KEY_ID || '',
  secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  service: 's3',
  region: 'auto',
});

app.post("/api/presign-upload", async (req, res) => {
  try {
    const { filename, contentType } = req.body;
    
    if (!filename || !contentType) {
      return res.status(400).json({ error: "Filename and contentType are required" });
    }

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      return res.status(500).json({ error: "Cloudflare R2 Environment Variables are missing. Please add them in the AI Studio Settings." });
    }

    const url = new URL(`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${filename}`);
    
    // Create a signed PUT request
    const signedRequest = await aws.sign(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType
      },
      aws: { signQuery: true }
    });

    res.json({ presignedUrl: signedRequest.url, filename });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ error: "Failed to generate presigned URL" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
