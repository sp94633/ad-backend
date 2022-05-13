const AWS = require('aws-sdk');
const AWS_REGION = "ap-south-1";
const AWS_ACCESS_KEY_ID = "AKIAVFD2RLVN6VEM46OM";
const AWS_SECRET_ACCESS_KEY = "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";
const S3BucketName = "sea-container";
AWS.config = new AWS.Config({
    region: AWS_REGION,
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    signatureVersion: "v4",
});

const s3 = new AWS.S3()


export const getS3SignedUrl = ( fileName: string ): string => {

    const signedUrl = s3.getSignedUrl("putObject", {
        Key: fileName,
        Bucket: S3BucketName,
   
        ACL: 'public-read',
        Expires: 60 * 60 || 900, // S3 default is 900 seconds (15 minutes)
    });
    return signedUrl;
}

export const getMultipleSignedUrl = (fileNames: string[]): string[] => {
    let signedUrls: string[] = [];
    for (let i = 0; i < fileNames.length; i++) {
        const signedUrl = s3.getSignedUrl("putObject", {
            Key: fileNames[i],
            Bucket: S3BucketName,
            ACL: 'public-read',
            Expires: 60 * 60 || 900, // S3 default is 900 seconds (15 minutes)
        });

        signedUrls.push(signedUrl)
    }
    return signedUrls;
}