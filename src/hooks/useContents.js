import { useQuery } from "@tanstack/react-query";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"; // Import for presigned URLs

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const excludeRegex = new RegExp(process.env.EXCLUDE_PATTERN || /(?!)/);

// Function to generate a presigned URL for a given object key
const generatePresignedUrl = async (bucketName, objectKey, expirationInSeconds) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: expirationInSeconds });
  return signedUrl;
};

const listContents = async (prefix) => {
  console.debug("Retrieving data from AWS SDK");
  const data = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: process.env.BUCKET_NAME,
      Prefix: prefix,
      Delimiter: "/",
    })
  );

  console.debug(`Received data: ${JSON.stringify(data, null, 2)}`);

  // Map through Contents and generate presigned URLs for each object
  const objectsWithPresignedUrls = await Promise.all(
    (data.Contents || []).filter(({ Key }) => !excludeRegex.test(Key)).map(async ({ Key, LastModified, Size }) => {
      const url = await generatePresignedUrl(process.env.BUCKET_NAME, Key, 3600); // Replace 3600 with your desired expiration time
      return {
        name: Key.slice(prefix.length),
        lastModified: LastModified,
        size: Size,
        path: Key,
        url: url,
      };
    })
  );

  return {
    folders:
      (data.CommonPrefixes || []).filter(({ Prefix }) => !excludeRegex.test(Prefix)).map(({ Prefix }) => ({
        name: Prefix.slice(prefix.length),
        path: Prefix,
        url: `/?prefix=${Prefix}`,
      })) || [],
    objects: objectsWithPresignedUrls,
  };
};

export const useContents = (prefix) => {
  return useQuery(["contents", prefix], () => listContents(prefix));
};
