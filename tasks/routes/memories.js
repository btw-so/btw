var express = require("express");
var router = express.Router();
var cors = require("cors");
var { getUserFromToken } = require("../logic/user");
var { getMemories, getPublicMemories, addMemory, updateMemory, deleteMemory } = require("../logic/memories");

// POST /memories/get - Get all memories for authenticated user
router.options(
    "/get",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/get",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint } = req.body || {};
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            if (!user) {
                throw new Error("User not found");
            }

            // Get memories from database
            const memories = await getMemories(user.id);

            console.log('Returning memories:', JSON.stringify(memories, null, 2));

            res.json({
                success: true,
                data: { memories },
                isLoggedIn: !!user,
            });
        } catch (e) {
            res.json({
                success: false,
                data: { memories: [] },
                error: e.message,
                isLoggedIn: false,
            });
        }
    }
);

// GET /memories/public/:userId - Public endpoint for published sites (no auth required)
router.get(
    "/public/:userId",
    cors({
        origin: '*', // Allow all origins for public endpoint
    }),
    async (req, res) => {
        try {
            const { userId } = req.params;

            // Get memories from database
            const memories = await getPublicMemories(parseInt(userId));

            res.json({
                success: true,
                data: { memories },
            });
        } catch (e) {
            res.json({
                success: false,
                data: { memories: [] },
                error: e.message,
            });
        }
    }
);

// POST /memories/add - Add a new memory (authenticated)
router.options(
    "/add",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.post(
    "/add",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, memory } = req.body || {};
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            if (!user) {
                throw new Error("User not found");
            }

            console.log('Adding memory with data:', JSON.stringify(memory, null, 2));

            // Validate required fields
            if (!memory || !memory.place_name || !memory.name) {
                throw new Error("Missing required memory fields");
            }

            // Validate location fields
            if (!memory.latitude || !memory.longitude) {
                throw new Error("Latitude and longitude are required");
            }

            if (!memory.city) {
                throw new Error("City is required");
            }

            if (!memory.country_code) {
                throw new Error("Country code is required");
            }

            // Add memory to database
            const newMemory = await addMemory(user.id, {
                place_name: memory.place_name,
                place_address: memory.place_address || null,
                latitude: parseFloat(memory.latitude),
                longitude: parseFloat(memory.longitude),
                place_type: memory.place_type || null,
                city: memory.city,
                country_code: memory.country_code,
                name: memory.name,
                description: memory.description || null,
                photo_urls: memory.photo_urls || [],
                visited_date: memory.visited_date || null,
                private: memory.private !== undefined ? memory.private : false,
            });

            console.log('Memory added successfully:', newMemory.id);

            res.json({
                success: true,
                data: { memory: newMemory },
                isLoggedIn: true,
            });
        } catch (e) {
            console.error('Error adding memory:', e);
            res.json({
                success: false,
                data: null,
                error: e.message || 'Failed to add memory',
                isLoggedIn: false,
            });
        }
    }
);

// PUT /memories/update - Update an existing memory (authenticated)
router.options(
    "/update",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.put(
    "/update",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, memoryId, memory } = req.body || {};
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            if (!user) {
                throw new Error("User not found");
            }

            // Validate required fields
            if (!memoryId || !memory || !memory.place_name || !memory.name) {
                throw new Error("Missing required memory fields");
            }

            // Validate location fields
            if (!memory.latitude || !memory.longitude) {
                throw new Error("Latitude and longitude are required");
            }

            if (!memory.city) {
                throw new Error("City is required");
            }

            if (!memory.country_code) {
                throw new Error("Country code is required");
            }

            // Update memory in database
            const updatedMemory = await updateMemory(user.id, memoryId, {
                place_name: memory.place_name,
                place_address: memory.place_address || null,
                latitude: parseFloat(memory.latitude),
                longitude: parseFloat(memory.longitude),
                place_type: memory.place_type || null,
                city: memory.city,
                country_code: memory.country_code,
                name: memory.name,
                description: memory.description || null,
                photo_urls: memory.photo_urls || [],
                visited_date: memory.visited_date || null,
                private: memory.private !== undefined ? memory.private : false,
            });

            if (!updatedMemory) {
                throw new Error("Memory not found or unauthorized");
            }

            res.json({
                success: true,
                data: { memory: updatedMemory },
                isLoggedIn: true,
            });
        } catch (e) {
            res.json({
                success: false,
                data: null,
                error: e.message,
                isLoggedIn: false,
            });
        }
    }
);

// DELETE /memories/delete - Delete a memory (authenticated)
router.options(
    "/delete",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    })
);
router.delete(
    "/delete",
    cors({
        credentials: true,
        origin: process.env.CORS_DOMAINS.split(","),
    }),
    async (req, res) => {
        const { fingerprint, memoryId } = req.body || {};
        const loginToken = req.cookies[process.env.BTW_UUID_KEY || "btw_uuid"];

        try {
            const user = await getUserFromToken({
                token: loginToken,
                fingerprint,
            });

            if (!user) {
                throw new Error("User not found");
            }

            // Validate required fields
            if (!memoryId) {
                throw new Error("Missing memory ID");
            }

            // Delete memory from database
            const deletedMemory = await deleteMemory(user.id, memoryId);

            if (!deletedMemory) {
                throw new Error("Memory not found or unauthorized");
            }

            res.json({
                success: true,
                data: { memory: deletedMemory },
                isLoggedIn: true,
            });
        } catch (e) {
            res.json({
                success: false,
                data: null,
                error: e.message,
                isLoggedIn: false,
            });
        }
    }
);

module.exports = router;
