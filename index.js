import express from "express";
import bodyParser from "body-parser";
import { NFTStorage, File } from "nft.storage";
import "dotenv/config";
import fetch, {
    Blob,
    blobFrom,
    blobFromSync,
    fileFrom,
    fileFromSync,
    FormData,
    Headers,
    Request,
    Response,
} from "node-fetch";

if (!globalThis.fetch) {
    globalThis.fetch = fetch;
    globalThis.Headers = Headers;
    globalThis.Request = Request;
    globalThis.Response = Response;
}

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const contributionTableUri =
    "https://testnet.tableland.network/query?s=SELECT%20*%20FROM%20MoogCon_80001_1144";
const postTableUri =
    "https://testnet.tableland.network/query?s=SELECT%20*%20FROM%20MoogPostTable_80001_1145";
const profileTableUri =
    "https://testnet.tableland.network/query?s=SELECT%20*%20FROM%20MoogUsers_80001_1147";
const projectTableUri =
    "https://testnet.tableland.network/query?s=SELECT%20*%20FROM%20MoogProjects_80001_1146";

const uploadJson = async (jsonObject) => {
    const token = process.env.NEXT_PUBLIC_NFT_STORAGE_API;
    const storage = new NFTStorage({ token });
    const jsonFile = new File(jsonObject, "moogData.json", {
        type: "application/json",
    });

    return await storage.storeDirectory([jsonFile]);
};

app.route("/uploadUserProfile").post(async (req, res) => {
    const data = req.body.data;
    const jsonCid = await uploadJson(JSON.stringify(data));
    const response =
        "https://nftstorage.link/ipfs/" + jsonCid + "/moogData.json";
    res.status(200).send({
        response,
    });
});

app.route("/fetchUserProfileById").post(async (req, res) => {
    const id = req.body.data;
    const query = profileTableUri + `%20WHERE%20id=${id}`;
    const request = await fetch(query);
    if (request.status.toString() === "404") {
        res.status(404).send({
            response: "data not found",
        });
        return;
    }
    const response = await request.json();
    const row = response.rows[0];
    const wallet = row[0];
    const name = row[2];
    const imageUri = row[3];

    res.status(200).send({ wallet, name, imageUri });
});

app.route("/fetchContributionByProjId").post(async (req, res) => {
    const id = req.body.data;
    const query = contributionTableUri + `%20WHERE%20projId=${id}`;
    const request = await fetch(query);
    if (request.status.toString() === "404") {
        res.status(404).send({
            response: "data not found",
        });
        return;
    }
    const response = await request.json();
    let row = [];
    response.rows.map((i) => row.push(i));

    res.status(200).send({
        response: row,
    });
});

app.route("/fetchPostById").post(async (req, res) => {
    const id = req.body.data;
    const query = postTableUri + `%20WHERE%20projId=${id}`;
    const request = await fetch(query);
    if (request.status.toString() === "404") {
        res.status(404).send({
            response: "data not found",
        });
        return;
    }
    const response = await request.json();
    const result = response.rows;
    let finResponse = [];
    for (let i = 0; i < result.length; i++) {
        const tempPost = result[i];
        const tempReq = await fetch(tempPost[3]);
        const temp = await tempReq.json();
        const tempRes = { postId: tempPost[2], author: tempPost[0], ...temp };
        finResponse.push(tempRes);
    }
    res.status(200).send({
        response: finResponse,
    });
});

app.route("/fetchProjectByProfile").post(async (req, res) => {
    const profAddress = req.body.data;
    const query = `https://testnet.tableland.network/query?s=SELECT%20id,title,imageUri%20FROM%20MoogProjects_80001_1146%20WHERE%20profAddress="${profAddress}"`;
    const request = await fetch(query);
    if (request.status.toString() === "404") {
        res.status(404).send({
            response: "data not found",
        });
        return;
    }
    const response = await request.json();
    let row = [];
    response.rows.map((i) => row.push(i));

    res.status(200).send({
        ids: row,
    });
});

app.route("/fetchProjectProfileById").post(async (req, res) => {
    const { profAddress, id } = req.body.data;
    const query = projectTableUri + `%20WHERE%20id=${id}`;
    const request = await fetch(query);
    if (request.status.toString() === "404") {
        res.status(404).send({
            response: "data not found",
        });
        return;
    }
    const response = await request.json();
    const row = response.rows[0];
    const wallet = row[0];
    const name = row[2];
    const imageUri = row[3];
    const bannerUri = row[4];
    const profileUri = row[5];

    const profReq = await fetch(profileUri);
    if (profReq.status.toString() === "404") {
        res.status(400).send({
            wallet: wallet,
            id: id,
            name: name,
            imageUri: imageUri,
            bannerUri: bannerUri,
            profileUri: "not found",
        });
        return;
    }
    const profRes = await profReq.json();
    const about = profRes.about;
    const skills = profRes.skills;
    const interests = profRes.interests;
    const website = profRes.website;
    const discord = profRes.discord;
    const twitter = profRes.twitter;
    const github = profRes.github;
    const requirements = profRes.requirements;

    res.status(200).send({
        wallet,
        id,
        name,
        imageUri,
        about,
        bannerUri,
        skills,
        interests,
        twitter,
        website,
        github,
        discord,
        requirements,
    });
});

app.route("/fetchUserProfile").post(async (req, res) => {
    const walletAddress = req.body.data;
    const query =
        profileTableUri + `%20WHERE%20profAddress=\"${walletAddress}\"`;
    const request = await fetch(query);
    if (request.status.toString() === "404") {
        res.status(404).send({
            response: "data not found",
        });
        return;
    }
    const response = await request.json();
    const row = response.rows[0];
    const wallet = row[0];
    const id = row[1];
    const name = row[2];
    const imageUri = row[3];
    const profileUri = row[4];
    const profReq = await fetch(profileUri);
    if (profReq.status.toString() === "404") {
        res.status(400).send({
            wallet: wallet,
            id: id,
            name: name,
            imageUri: imageUri,
            profileUri: "not found",
        });
        return;
    }
    const profRes = await profReq.json();
    const about = profRes.about;
    const banner = profRes.banner;
    const skills = profRes.skills;
    const interests = profRes.interests;
    const website = profRes.website;
    const discord = profRes.discord;
    const twitter = profRes.twitter;
    const github = profRes.github;

    res.status(200).send({
        wallet,
        id,
        name,
        imageUri,
        about,
        banner,
        skills,
        interests,
        twitter,
        website,
        github,
        discord,
    });
});

app.listen(process.env.port || 4000, function () {
    console.log("Server started on port 4000");
});
