import { Router } from 'express';
import {
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists,
    removeVideoFromPlaylist,
    updatePlaylist,
} from "../controllers/playlist.controller.js"
import {verifyJWT} from "../middlewares/authentication.middleware.js"
import { authorizeById } from '../middlewares/authorization.middleware.js';
import { Playlist } from '../models/playlist.model.js';


const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/")
    .post(createPlaylist)

router.route("/:playlistId")
    .get(getPlaylistById)
    .patch(
        authorizeById({ action: "update", subject: "Playlist", Model: Playlist, param: "playlistId" }),
        updatePlaylist
    )
    .delete(
        authorizeById({ action: "delete", subject: "Playlist", Model: Playlist, param: "playlistId" }),
        deletePlaylist
    );

router.route("/add/:videoId/:playlistId")
    .patch(
        authorizeById({ action: "update", subject: "Playlist", Model: Playlist, param: "playlistId" }),
        addVideoToPlaylist
    );

router.route("/remove/:videoId/:playlistId")
    .patch(
        authorizeById({ action: "update", subject: "Playlist", Model: Playlist, param: "playlistId" }),
        removeVideoFromPlaylist
    );

router.route("/user/:userId")
    .get(getUserPlaylists);

export default router