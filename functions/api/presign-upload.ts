import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function onRequestPost({ request, env }) {
  try {
    const { filename, contentType } = await request.json();
    
    if (!filename || !contentType) {
      return new Response(JSON.stringify({ error: "Filename and contentType are required" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: env.R2_SECRET_ACCESS_KEY || '',
      },
    });

    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: filename,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    return new Response(JSON.stringify({ presignedUrl, filename }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return new Response(JSON.stringify({ error: "Failed to generate presigned URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
