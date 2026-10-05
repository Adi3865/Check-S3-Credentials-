// Create a file named `.env` in the root of your project and add the following content, replacing the placeholders with your actual AWS credentials and bucket information:

// ```
// AWS_ACCESS_KEY_ID=your_access_key_id
// AWS_SECRET_ACCESS_KEY=your_secret_access_key
// AWS_REGION=your_region
// S3_BUCKET=your_bucket_name
// ```

// this is test the alll the S3 permissions and access to the bucket and objects. It will perform the following tests:


require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");

const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");

// =====================================================
// CONFIGURATION
// =====================================================

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// Object already present in your bucket
const EXISTING_OBJECT = "alberta-2297204_1280-2.jpg";

// Test object that we will upload
const TEST_OBJECT = "s3-access-test/test-upload.txt";

// Local files
const TEST_FILE = path.join(__dirname, "test-upload.txt");
const DOWNLOAD_FILE = path.join(__dirname, "downloaded-test-upload.txt");

// =====================================================
// VALIDATE ENVIRONMENT
// =====================================================

console.log("\n==============================================");
console.log("        AWS S3 ACCESS TEST PROJECT");
console.log("==============================================\n");

console.log("Configuration:");
console.log("Region      :", REGION);
console.log("Bucket      :", BUCKET);
console.log(
  "Access Key  :",
  ACCESS_KEY ? `${ACCESS_KEY.substring(0, 4)}********` : "MISSING"
);
console.log(
  "Secret Key  :",
  SECRET_KEY ? "******** PRESENT" : "MISSING"
);
console.log("Session Token:", process.env.AWS_SESSION_TOKEN ? "PRESENT" : "NOT USED");

if (!ACCESS_KEY || !SECRET_KEY || !REGION || !BUCKET) {
  console.error("\n❌ Missing required environment variables.");
  console.error("Check your .env file.");
  process.exit(1);
}

// =====================================================
// CREATE S3 CLIENT
// =====================================================

const s3 = new S3Client({
  region: REGION,

  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

// =====================================================
// HELPER
// =====================================================

function printError(error) {
  console.error("\n❌ ERROR");
  console.error("Name       :", error.name);
  console.error("Message    :", error.message);

  if (error.$metadata) {
    console.error(
      "HTTP Status:",
      error.$metadata.httpStatusCode || "N/A"
    );

    console.error(
      "Request ID :",
      error.$metadata.requestId || "N/A"
    );
  }

  console.error("");
}

// =====================================================
// TEST 1 - LIST BUCKET
// =====================================================

async function testListBucket() {
  console.log("\n----------------------------------------------");
  console.log("TEST 1: LIST S3 BUCKET");
  console.log("----------------------------------------------");

  try {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        MaxKeys: 20,
      })
    );

    console.log("✅ LIST SUCCESS");

    console.log("\nObjects:");

    if (!response.Contents || response.Contents.length === 0) {
      console.log("Bucket is empty.");
      return true;
    }

    response.Contents.forEach((object, index) => {
      console.log(
        `${index + 1}. ${object.Key} | ${object.Size || 0} bytes`
      );
    });

    return true;
  } catch (error) {
    printError(error);
    return false;
  }
}

// =====================================================
// TEST 2 - CHECK EXISTING OBJECT
// =====================================================

async function testHeadObject() {
  console.log("\n----------------------------------------------");
  console.log("TEST 2: CHECK EXISTING OBJECT");
  console.log("----------------------------------------------");

  console.log("Object:", EXISTING_OBJECT);

  try {
    const response = await s3.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: EXISTING_OBJECT,
      })
    );

    console.log("✅ OBJECT EXISTS");

    console.log("Content-Type:", response.ContentType);
    console.log("Size        :", response.ContentLength, "bytes");
    console.log("ETag        :", response.ETag);

    return true;
  } catch (error) {
    printError(error);
    return false;
  }
}

// =====================================================
// TEST 3 - UPLOAD
// =====================================================

async function testUpload() {
  console.log("\n----------------------------------------------");
  console.log("TEST 3: UPLOAD OBJECT");
  console.log("----------------------------------------------");

  if (!fs.existsSync(TEST_FILE)) {
    fs.writeFileSync(
      TEST_FILE,
      "Hello from AWS S3 Access Test Project\n"
    );

    console.log("Created local test file.");
  }

  console.log("Local file :", TEST_FILE);
  console.log("S3 object  :", TEST_OBJECT);

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: TEST_OBJECT,
        Body: fs.createReadStream(TEST_FILE),
        ContentType: "text/plain",
      })
    );

    console.log("✅ UPLOAD SUCCESS");

    console.log(
      `S3 URI: s3://${BUCKET}/${TEST_OBJECT}`
    );

    return true;
  } catch (error) {
    printError(error);
    return false;
  }
}

// =====================================================
// TEST 4 - READ / DOWNLOAD
// =====================================================

async function testRead() {
  console.log("\n----------------------------------------------");
  console.log("TEST 4: READ / DOWNLOAD OBJECT");
  console.log("----------------------------------------------");

  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: TEST_OBJECT,
      })
    );

    const body = await response.Body.transformToString();

    console.log("✅ READ SUCCESS");

    console.log("\nObject Content:");
    console.log("--------------------------------");
    console.log(body.trim());
    console.log("--------------------------------");

    fs.writeFileSync(DOWNLOAD_FILE, body);

    console.log("\nDownloaded locally:");
    console.log(DOWNLOAD_FILE);

    return true;
  } catch (error) {
    printError(error);
    return false;
  }
}

// =====================================================
// TEST 5 - PRESIGNED URL FOR EXISTING IMAGE
// =====================================================

async function generateImagePresignedURL() {
  console.log("\n----------------------------------------------");
  console.log("TEST 5: GENERATE PRESIGNED URL");
  console.log("----------------------------------------------");

  console.log("Object:", EXISTING_OBJECT);

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: EXISTING_OBJECT,
    });

    const url = await getSignedUrl(
      s3,
      command,
      {
        expiresIn: 3600,
      }
    );

    console.log("✅ PRESIGNED URL GENERATED");

    console.log("\nURL:");
    console.log(url);

    console.log("\nURL expires in: 1 hour");

    return true;
  } catch (error) {
    printError(error);
    return false;
  }
}

// =====================================================
// TEST 6 - PRESIGNED URL FOR UPLOADED FILE
// =====================================================

async function generateTestFileURL() {
  console.log("\n----------------------------------------------");
  console.log("TEST 6: PRESIGNED URL FOR UPLOADED FILE");
  console.log("----------------------------------------------");

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: TEST_OBJECT,
    });

    const url = await getSignedUrl(
      s3,
      command,
      {
        expiresIn: 3600,
      }
    );

    console.log("✅ PRESIGNED URL GENERATED");

    console.log("\nURL:");
    console.log(url);

    return true;
  } catch (error) {
    printError(error);
    return false;
  }
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  const results = {};

  results.list = await testListBucket();

  results.head = await testHeadObject();

  results.upload = await testUpload();

  results.read = await testRead();

  results.imageUrl = await generateImagePresignedURL();

  results.testUrl = await generateTestFileURL();

  // ===================================================
  // FINAL RESULT
  // ===================================================

  console.log("\n");
  console.log("==============================================");
  console.log("              FINAL TEST RESULT");
  console.log("==============================================");

  console.log(
    "LIST BUCKET       :",
    results.list ? "✅ PASS" : "❌ FAIL"
  );

  console.log(
    "CHECK OBJECT      :",
    results.head ? "✅ PASS" : "❌ FAIL"
  );

  console.log(
    "UPLOAD            :",
    results.upload ? "✅ PASS" : "❌ FAIL"
  );

  console.log(
    "READ/DOWNLOAD     :",
    results.read ? "✅ PASS" : "❌ FAIL"
  );

  console.log(
    "IMAGE SIGNED URL  :",
    results.imageUrl ? "✅ PASS" : "❌ FAIL"
  );

  console.log(
    "TEST FILE URL     :",
    results.testUrl ? "✅ PASS" : "❌ FAIL"
  );

  console.log("==============================================\n");

  console.log("Your original URL:");
  console.log(
    `https://${BUCKET}.s3.${REGION}.amazonaws.com/${EXISTING_OBJECT}`
  );

  console.log("\nThe original URL may show AccessDenied.");
  console.log(
    "Use the PRESIGNED URL generated above to open the private object in Chrome."
  );

  console.log("\n==============================================\n");
}

main();