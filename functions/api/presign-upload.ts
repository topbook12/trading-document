import { AwsClient } from 'aws4fetch';

export async function onRequestPost({ request, env }: any) {
  try {
    const { filename, contentType } = await request.json();
    
    if (!filename || !contentType) {
      return new Response(JSON.stringify({ error: "Filename and contentType are required" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!env || !env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME) {
      return new Response(JSON.stringify({ error: "Cloudflare R2 Environment Variables are missing. Please add them in the Pages Settings." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const aws = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: env.R2_SECRET_ACCESS_KEY || '',
      service: 's3',
      region: 'auto',
    });

    const url = new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${filename}`);
    
    const signedRequest = await aws.sign(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType
      },
      aws: { signQuery: true }
    });

    return new Response(JSON.stringify({ presignedUrl: signedRequest.url, filename }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Error generating presigned URL:", error);
    return new Response(JSON.stringify({ error: "Failed to generate presigned URL", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
