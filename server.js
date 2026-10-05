// Tets the imahge viewer that streams a private image from AWS S3 to the browser using Node.js and Express.   
   
    
   
   
   require("dotenv").config();

    const express = require("express");
    const {
    S3Client,
    GetObjectCommand,
    } = require("@aws-sdk/client-s3");

    const app = express();

    const PORT = process.env.PORT || 3000;
    const BUCKET = process.env.S3_BUCKET;
    const REGION = process.env.AWS_REGION;

    const IMAGE_KEY = "image-2297204_1280-2.jpg";

    const s3 = new S3Client({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,

        ...(process.env.AWS_SESSION_TOKEN
        ? {
            sessionToken: process.env.AWS_SESSION_TOKEN,
            }
        : {}),
    },
    });


    // ==========================================
    // HOME
    // ==========================================

    app.get("/", (req, res) => {
    res.send(`
        <h1>AWS S3 Private Image Viewer</h1>

        <p>
        <a href="/image">Open S3 Image</a>
        </p>
    `);
    });


    // ==========================================
    // DISPLAY PRIVATE S3 IMAGE
    // ==========================================

    app.get("/image", async (req, res) => {
    try {
        console.log("Requesting S3 object:");
        console.log(`Bucket: ${BUCKET}`);
        console.log(`Key   : ${IMAGE_KEY}`);

        const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: IMAGE_KEY,
        });

        const response = await s3.send(command);

        console.log("S3 object found");
        console.log("Content-Type:", response.ContentType);
        console.log("Content-Length:", response.ContentLength);

        // Tell Chrome this response is an image
        res.setHeader(
        "Content-Type",
        response.ContentType || "image/jpeg"
        );

        if (response.ContentLength) {
        res.setHeader(
            "Content-Length",
            response.ContentLength
        );
        }

        // Stream S3 image directly to browser
        response.Body.pipe(res);

    } catch (error) {

        console.error("S3 ERROR:");
        console.error(error);

        res.status(500).send(`
        <h1>S3 Image Error</h1>

        <pre>${error.message}</pre>
        `);
    }
    });


    // ==========================================
    // SERVER
    // ==========================================

    app.listen(PORT, () => {

    console.log(`
    ========================================
        S3 IMAGE VIEWER
    ========================================

    Bucket : ${BUCKET}
    Region : ${REGION}
    Object : ${IMAGE_KEY}

    Open in Chrome:

    http://localhost:${PORT}/image

    ========================================
    `);
    });