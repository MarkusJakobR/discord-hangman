import fetch from "node-fetch";

async function getSpotifyToken() {
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          process.env.SPOTIFY_CLIENT_ID +
            ":" +
            process.env.SPOTIFY_CLIENT_SECRET,
        ).toString("base64"),
    },
    body: params,
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Error fetching Spotify token: ", errorData);
    throw new Error("Failed to fetch Spotify token.");
  }
  const data = await response.json();
  return data.access_token;
}

async function getPlaylistTracks(playlistId) {
  const token = await getSpotifyToken();
  const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

  console.log("--- Spotify Request Details ---");
  console.log("Request URL: ", url);
  console.log("Access Token Used: ", token);
  console.log("--------------------------------");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json();
    console.error("Error fetching Spotify playlist: ", errorData);
    return [];
  }
  const data = await res.json();
  // console.log("SUCCESS! Received data from spotify: ", data);
  // return [data.name];
  if (!data.items) {
    console.error("Spotify response is missing 'items' property: ", data);
    return [];
  }
  return data.items.map((item) => item.track.name);
}

const TOP50_PH = "37i9dQZEVXbNBz9cRCSFkY";
const TOP50_GLOBAL = "37i9dQZEVXbMDoHDwVN2tF";
const MY_PLAYLIST = "0gAVMCYREjceFfjG5phYxl";

export { getPlaylistTracks, TOP50_PH, TOP50_GLOBAL, MY_PLAYLIST };
