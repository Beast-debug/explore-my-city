
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");
const app = express();

app.use(cors());
app.use(express.json());

// -------------------- HOME --------------------
app.get("/", (req, res) => {
  res.send("Explore My City backend is running!");
});

// -------------------- GET ALL PLACES --------------------
app.get("/api/places", async (req, res) => {
  try {
    const [places] = await pool.query(
      "SELECT * FROM places ORDER BY id"
    );
    res.json(places);
  } catch (error) {
    console.error("Get places error:", error.message);
    res.status(500).json({ error: "Could not fetch places" });
  }
});

// -------------------- GET ONE PLACE --------------------
app.get("/api/places/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid place ID" });
    }

    const [places] = await pool.query(
      "SELECT * FROM places WHERE id = ?",
      [id]
    );

    if (places.length === 0) {
      return res.status(404).json({ error: "Place not found" });
    }

    res.json(places[0]);
  } catch (error) {
    console.error("Get place error:", error.message);
    res.status(500).json({ error: "Could not fetch place" });
  }
});

// -------------------- CREATE TRIP --------------------
app.post("/api/trips", async (req, res) => {
  const tripName =
    typeof req.body.trip_name === "string"
      ? req.body.trip_name.trim()
      : "";

  const placeIds = req.body.place_ids;

  if (!tripName || tripName.length > 100) {
    return res.status(400).json({ error: "Enter a valid trip name" });
  }

  if (
    !Array.isArray(placeIds) ||
    placeIds.length === 0 ||
    placeIds.some(id => !Number.isInteger(Number(id)) || Number(id) < 1)
  ) {
    return res.status(400).json({
      error: "Add at least one valid destination"
    });
  }

  const uniqueIds = [...new Set(placeIds.map(Number))];
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [foundPlaces] = await connection.query(
      "SELECT id FROM places WHERE id IN (?)",
      [uniqueIds]
    );

    if (foundPlaces.length !== uniqueIds.length) {
      await connection.rollback();
      return res.status(400).json({
        error: "One or more destinations do not exist"
      });
    }

    const [result] = await connection.query(
      "INSERT INTO trips (trip_name) VALUES (?)",
      [tripName]
    );

    const values = uniqueIds.map(id => [result.insertId, id]);

    await connection.query(
      "INSERT INTO trip_places (trip_id, place_id) VALUES ?",
      [values]
    );

    await connection.commit();

    res.status(201).json({
      message: "Trip saved successfully",
      id: result.insertId,
      trip_name: tripName,
      place_ids: uniqueIds
    });
  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Create trip error:", error.message);
    res.status(500).json({ error: "Could not save trip" });
  } finally {
    if (connection) connection.release();
  }
});

// -------------------- GET ALL SAVED TRIPS --------------------
app.get("/api/trips", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        t.id AS trip_id,
        t.trip_name,
        t.created_at,
        p.id AS place_id,
        p.name AS place_name,
        p.category,
        p.description,
        p.location,
        p.image_url,
        p.estimated_cost
      FROM trips t
      LEFT JOIN trip_places tp ON t.id = tp.trip_id
      LEFT JOIN places p ON tp.place_id = p.id
      ORDER BY t.id DESC, p.id ASC
    `);

    const tripsMap = new Map();

    for (const row of rows) {
      if (!tripsMap.has(row.trip_id)) {
        tripsMap.set(row.trip_id, {
          id: row.trip_id,
          trip_name: row.trip_name,
          created_at: row.created_at,
          places: []
        });
      }

      if (row.place_id !== null) {
        tripsMap.get(row.trip_id).places.push({
          id: row.place_id,
          name: row.place_name,
          category: row.category,
          description: row.description,
          location: row.location,
          image_url: row.image_url,
          cost: Number(row.estimated_cost) || 0
        });
      }
    }

    res.json([...tripsMap.values()]);
  } catch (error) {
    console.error("Get trips error:", error.message);
    res.status(500).json({ error: "Could not fetch saved trips" });
  }
});

// -------------------- GET ONE SAVED TRIP --------------------
app.get("/api/trips/:id", async (req, res) => {
  try {
    const tripId = Number(req.params.id);

    if (!Number.isInteger(tripId) || tripId < 1) {
      return res.status(400).json({ error: "Invalid trip ID" });
    }

    const [rows] = await pool.query(
      `SELECT
         t.id AS trip_id,
         t.trip_name,
         t.created_at,
         p.id AS place_id,
         p.name AS place_name,
         p.category,
         p.description,
         p.location,
         p.image_url,
         p.estimated_cost
       FROM trips t
       LEFT JOIN trip_places tp ON t.id = tp.trip_id
       LEFT JOIN places p ON tp.place_id = p.id
       WHERE t.id = ?
       ORDER BY p.id ASC`,
      [tripId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Trip not found" });
    }

    res.json({
      id: rows[0].trip_id,
      trip_name: rows[0].trip_name,
      created_at: rows[0].created_at,
      places: rows
        .filter(row => row.place_id !== null)
        .map(row => ({
          id: row.place_id,
          name: row.place_name,
          category: row.category,
          description: row.description,
          location: row.location,
          image_url: row.image_url,
          cost: Number(row.estimated_cost) || 0
        }))
    });
  } catch (error) {
    console.error("Get trip error:", error.message);
    res.status(500).json({ error: "Could not load trip" });
  }
});

// -------------------- UPDATE SAVED TRIP --------------------
app.put("/api/trips/:id", async (req, res) => {
  const tripId = Number(req.params.id);
  const tripName =
    typeof req.body.trip_name === "string"
      ? req.body.trip_name.trim()
      : "";
  const placeIds = req.body.place_ids;

  if (!Number.isInteger(tripId) || tripId < 1) {
    return res.status(400).json({ error: "Invalid trip ID" });
  }

  if (!tripName || tripName.length > 100) {
    return res.status(400).json({ error: "Enter a valid trip name" });
  }

  if (
    !Array.isArray(placeIds) ||
    placeIds.length === 0 ||
    placeIds.some(id => !Number.isInteger(Number(id)) || Number(id) < 1)
  ) {
    return res.status(400).json({
      error: "Add at least one valid destination"
    });
  }

  const uniqueIds = [...new Set(placeIds.map(Number))];
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existing] = await connection.query(
      "SELECT id FROM trips WHERE id = ?",
      [tripId]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Saved trip not found" });
    }

    const [foundPlaces] = await connection.query(
      "SELECT id FROM places WHERE id IN (?)",
      [uniqueIds]
    );

    if (foundPlaces.length !== uniqueIds.length) {
      await connection.rollback();
      return res.status(400).json({
        error: "One or more destinations do not exist"
      });
    }

    await connection.query(
      "UPDATE trips SET trip_name = ? WHERE id = ?",
      [tripName, tripId]
    );

    await connection.query(
      "DELETE FROM trip_places WHERE trip_id = ?",
      [tripId]
    );

    const values = uniqueIds.map(id => [tripId, id]);

    await connection.query(
      "INSERT INTO trip_places (trip_id, place_id) VALUES ?",
      [values]
    );

    await connection.commit();

    res.json({
      message: "Trip updated successfully",
      id: tripId,
      trip_name: tripName,
      place_ids: uniqueIds
    });
  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Update trip error:", error.message);
    res.status(500).json({ error: "Could not update trip" });
  } finally {
    if (connection) connection.release();
  }
});

// -------------------- DELETE SAVED TRIP --------------------
app.delete("/api/trips/:id", async (req, res) => {
  const tripId = Number(req.params.id);

  if (!Number.isInteger(tripId) || tripId < 1) {
    return res.status(400).json({ error: "Invalid trip ID" });
  }

  try {
    const [result] = await pool.query(
      "DELETE FROM trips WHERE id = ?",
      [tripId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Saved trip not found" });
    }

    res.json({
      message: "Trip deleted successfully",
      id: tripId
    });
  } catch (error) {
    console.error("Delete trip error:", error.message);
    res.status(500).json({ error: "Could not delete trip" });
  }
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Explore My City API running at http://localhost:${PORT}`);
});
