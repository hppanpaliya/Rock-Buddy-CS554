const axios = require('axios')
const SpotifyWebApi = require('spotify-web-api-node');
const helper = require('../helper');
const { SPOTIFY_API_BASE_URL, GENIUS_API_BASE_URL } = helper.constants;
const { checkString } = helper.validations;

const redis = require('redis');
const client = redis.createClient();
client.connect().then(() => {});

const https = require('https');
const fs = require('fs');
const gm = require('gm');

const lyricsParse = require('lyrics-parse');
/**
 * Gets an artist given an id
 * 
 * @param {string} id
 * 
 * @returns {object} artist
 */
async function getArtistById(id) { 
	id = checkString(id);

	const exists = await client.exists(`artist.${id}`);
	
	if(exists) {
		const artist = await client.get(`artist.${id}`);
		return JSON.parse(artist);
	} else {
		const response = await axios.get(`${SPOTIFY_API_BASE_URL}/artists/${id}`,
			{
				headers: { 'Authorization': `Bearer ${process.env.AUTH_TOKEN}` }
			}
		);
		//.images[0].url
		const artist = response.data;
		// const imgUrl = artist.images[0].url;
		// https.get(imgUrl, (res) => { 
		// 	gm(res)
		// 		.resize(300, 300)
		// 		.write(`public/img/artists/${id}.jpg`, (err) => {
		// 			if(err) {
		// 				console.log(err);
		// 			}
			
		// 		});
		// });
		await client.set(`artist.${id}`, JSON.stringify(artist));
		return artist;
	}
}

/**
 * 
 * @param {string} id 
 * @returns {object} top tracks for artist
 */
async function getArtistTopTracksById(id) { 

	id = checkString(id);
	const exists = await client.exists(`artist.${id}.topTracks`);

	if(exists) {
		const topTracks = await client.get(`artist.${id}.topTracks`);
		return JSON.parse(topTracks);
	} else {
		const response = await axios.get(`${SPOTIFY_API_BASE_URL}/artists/${id}/top-tracks?country=US`,
			{
				headers: { 'Authorization': `Bearer ${process.env.AUTH_TOKEN}` }
			}
		);
		const topTracks = response.data;
		await client.set(`artist.${id}.topTracks`, JSON.stringify(topTracks));
		return response.data;
	}


}

/**
 * 
 * @param {string} id 
 * @returns {object} albums for artist
 */
async function getArtistAlbumsById(id) { 
	id = checkString(id);
	const exists = await client.exists(`artist.${id}.albums`);
	
	if(exists) { 
		const albums = await client.get(`artist.${id}.albums`);
		return JSON.parse(albums);
	} else { 
		const response = await axios.get(`${SPOTIFY_API_BASE_URL}/artists/${id}/albums?include_groups=album&market=US`,
			{
				headers: { 'Authorization': `Bearer ${process.env.AUTH_TOKEN}` }
			}
		);
		const seenNames = [];
		response.data.items = response.data.items.filter((album) => {
			if(seenNames.includes(album.name.toLowerCase())){
				return false;
			}
				
			seenNames.push(album.name.toLowerCase());
			return true;
		});
		const albums = response.data;
		await client.set(`artist.${id}.albums`, JSON.stringify(albums));
		return albums;
	}
}

/**
 * 
 * @param {string} id 
 * @param {string} artistName 
 * @returns {string} description of artist
 */
async function getArtistDescription(id, artistName) { 
	
	id = checkString(id);
	artistName = checkString(artistName);
	const exists = await client.exists(`artist.${id}.description`);
	
	if(exists) { 
		const description = await client.get(`artist.${id}.description`);
		return description;
	} else { 
		const searchResponse = await axios.get(`${GENIUS_API_BASE_URL}/search?q=${artistName}`, 
			{
				headers: { 'Authorization': `Bearer ${process.env.GENIUS_ACCESS_TOKEN}` }
			}
		);
		const artistId = searchResponse.data.response.hits[0].result.primary_artist.id;
		const artistResponse = await axios.get(`${GENIUS_API_BASE_URL}/artists/${artistId}?text_format=plain`,
			{
				headers: { 'Authorization': `Bearer ${process.env.GENIUS_ACCESS_TOKEN}` }
			}
		);
		const description = artistResponse.data.response.artist.description.plain;
		await client.set(`artist.${id}.description`, description);
		return description;
	}
}

/**
 * Gets an album given an id
 * 
 * @param {string} id
 * 
 * @returns {object} album
 */
async function getAlbumById(id) { 
	
	id = checkString(id);
	
	const exists = await client.exists(`album.${id}`);

	if(exists) {
		const album = await client.get(`album.${id}`);
		return JSON.parse(album);
	} else {
		const response = await axios.get(`${SPOTIFY_API_BASE_URL}/albums/${id}`,
			{
				headers: { 'Authorization': `Bearer ${process.env.AUTH_TOKEN}` }
			}
		);
		const album = response.data;
		await client.set(`album.${id}`, JSON.stringify(album));
		return album;
	}
}

/**
 * Gets an track given an id
 * 
 * @param {string} id
 * 
 * @returns {object} track
 */
async function getTrackById(id) {
	
	id = checkString(id);
	const exists = await client.exists(`track.${id}`);

	if(exists) { 
		const track = await client.get(`track.${id}`);
		return JSON.parse(track);
	} else { 
		const response = await axios.get(`${SPOTIFY_API_BASE_URL}/tracks/${id}`,
			{
				headers: { 'Authorization': `Bearer ${process.env.AUTH_TOKEN}` }
			}
		);
		const track = response.data;
		await client.set(`track.${id}`, JSON.stringify(track));
		return track;
	}
}

/**
 * 
 * @param {string} id 
 * @param {string} artistName 
 * @param {string} trackName 
 * @returns {string} song lyrics
 */
async function getTrackLyrics(id, artistName, trackName) { 

	id = checkString(id);
	artistName = checkString(artistName);
	trackName = checkString(trackName);
	trackName = trackName.replace(/[^a-zA-Z0-9 ]/g, '');
	trackName = trackName.split('feat')[0];
	console.log(trackName);
	const exists = await client.exists(`track.${id}.lyrics`);
	
	if(exists) { 
		const lyrics = await client.get(`track.${id}.lyrics`);
		console.log(lyrics);
		return lyrics;
	} else {
		const lyrics = await lyricsParse(trackName, artistName);
		await client.set(`track.${id}.lyrics`, lyrics || "none");
		return lyrics || "none";
	}
}

module.exports ={
	getArtistById,
	getAlbumById,
	getTrackById,
	getArtistTopTracksById,
	getArtistAlbumsById,
	getTrackLyrics,
	getArtistDescription
}