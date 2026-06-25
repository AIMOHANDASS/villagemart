"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDistance = exports.searchLocation = void 0;
const KARUR_LAT = 10.9601;
const KARUR_LON = 78.0766;
const searchLocation = async (req, res) => {
    const q = req.query.q;
    if (!q) {
        return res.status(400).json({ success: false, message: "Query is required" });
    }
    try {
        // 1. Photon API Search with local bias (Karur)
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${KARUR_LAT}&lon=${KARUR_LON}&limit=10`;
        let response = await fetch(photonUrl);
        let data = await response.json();
        let results = data.features.map((f) => ({
            name: f.properties.name,
            city: f.properties.city || f.properties.county || "",
            state: f.properties.state || "",
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            source: "photon"
        }));
        // 2. Fallback to Bhuvan API if empty
        if (results.length === 0) {
            // Mock Bhuvan API call - in a real scenario you would call the actual Bhuvan endpoint.
            // Often, Bhuvan's API is not openly documented or relies on public WFS/WMS which might have specific payloads.
            // We will simulate it or try a specific open Bhuvan API if you have details.
            // For now, simulating fallback functionality to show architecture.
            console.log("No Photon results, searching Bhuvan API fallback...");
            try {
                const bhuvanUrl = `https://bhuvan-app3.nrsc.gov.in/api/poi/poi_search.php?q=${encodeURIComponent(q)}&lat=${KARUR_LAT}&lon=${KARUR_LON}`;
                let bhuvanRes = await fetch(bhuvanUrl);
                let bhuvanData = await bhuvanRes.text();
                // Bhuvan might return CSV, JSON or XML. Fallback with simulated location if failed.
                // You would parse bhuvanData here.
            }
            catch (e) {
                console.error("Bhuvan API fallback failed", e);
            }
        }
        return res.json({ success: true, data: results });
    }
    catch (error) {
        console.error("Location search error:", error);
        return res.status(500).json({ success: false, message: "Search failed" });
    }
};
exports.searchLocation = searchLocation;
const getDistance = async (req, res) => {
    const { startLat, startLon, endLat, endLon } = req.query;
    if (!startLat || !startLon || !endLat || !endLon) {
        return res.status(400).json({ success: false, message: "Coordinates are required" });
    }
    try {
        // Distance Calculation (Simulating Bhuvan Shortest Path API)
        // Bhuvan routing API expects specific layer/WFS inputs. 
        // We will use Haversine as an immediate reliable fallback, multiplied by a road factor (~1.3).
        const R = 6371; // km
        const dLat = (Number(endLat) - Number(startLat)) * Math.PI / 180;
        const dLon = (Number(endLon) - Number(startLon)) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(Number(startLat) * Math.PI / 180) * Math.cos(Number(endLat) * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceStraightKm = R * c;
        const estimatedRoadDistance = distanceStraightKm * 1.3;
        // Apply Rate per km - Example 10 Rs per km
        const ratePerKm = 10;
        const price = Math.round(estimatedRoadDistance * ratePerKm);
        return res.json({
            success: true,
            data: {
                distanceKm: Number(estimatedRoadDistance.toFixed(2)),
                price,
                source: "bhuvan_simulated"
            }
        });
    }
    catch (error) {
        console.error("Distance error:", error);
        return res.status(500).json({ success: false, message: "Distance calculation failed" });
    }
};
exports.getDistance = getDistance;
