var express = require("express");
var router = express.Router();
var cors = require("cors");
var { getUserFromToken } = require("../logic/user");

// Hardcoded places data for all users
// New York, USA; Rome, Italy; Singapore; Ahmedabad, India
const HARDCODED_PLACES = [
    {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "New York",
        latitude: 40.7128,
        longitude: -74.0060,
        type: "city",
        country_code: "US",
        visited_date: "2024-01-15T00:00:00Z",
        description: "The Big Apple - vibrant city with amazing energy",
        created_at: "2024-01-15T00:00:00Z",
        updated_at: "2024-01-15T00:00:00Z"
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440002",
        name: "Rome",
        latitude: 41.9028,
        longitude: 12.4964,
        type: "city",
        country_code: "IT",
        visited_date: "2024-03-20T00:00:00Z",
        description: "The Eternal City - history and culture at every corner",
        created_at: "2024-03-20T00:00:00Z",
        updated_at: "2024-03-20T00:00:00Z"
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440003",
        name: "Singapore",
        latitude: 1.3521,
        longitude: 103.8198,
        type: "city",
        country_code: "SG",
        visited_date: "2024-05-10T00:00:00Z",
        description: "Modern metropolis with incredible food and architecture",
        created_at: "2024-05-10T00:00:00Z",
        updated_at: "2024-05-10T00:00:00Z"
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440004",
        name: "Ahmedabad",
        latitude: 23.0225,
        longitude: 72.5714,
        type: "city",
        country_code: "IN",
        visited_date: "2024-07-05T00:00:00Z",
        description: "Heritage city with rich textile history and delicious Gujarati cuisine",
        created_at: "2024-07-05T00:00:00Z",
        updated_at: "2024-07-05T00:00:00Z"
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440005",
        name: "United States",
        latitude: 37.0902,
        longitude: -95.7129,
        type: "country",
        country_code: "US",
        visited_date: "2024-01-15T00:00:00Z",
        description: "Visited multiple cities across the USA",
        created_at: "2024-01-15T00:00:00Z",
        updated_at: "2024-01-15T00:00:00Z"
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440006",
        name: "Italy",
        latitude: 41.8719,
        longitude: 12.5674,
        type: "country",
        country_code: "IT",
        visited_date: "2024-03-20T00:00:00Z",
        description: "Explored the beautiful Italian countryside",
        created_at: "2024-03-20T00:00:00Z",
        updated_at: "2024-03-20T00:00:00Z"
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440007",
        name: "Singapore",
        latitude: 1.3521,
        longitude: 103.8198,
        type: "country",
        country_code: "SG",
        visited_date: "2024-05-10T00:00:00Z",
        description: "City-state with incredible diversity",
        created_at: "2024-05-10T00:00:00Z",
        updated_at: "2024-05-10T00:00:00Z"
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440008",
        name: "India",
        latitude: 20.5937,
        longitude: 78.9629,
        type: "country",
        country_code: "IN",
        visited_date: "2024-07-05T00:00:00Z",
        description: "Land of diversity, culture, and incredible experiences",
        created_at: "2024-07-05T00:00:00Z",
        updated_at: "2024-07-05T00:00:00Z"
    }
];

// GET /places - Get all places for authenticated user
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

            // Return hardcoded places with user_id attached
            const places = HARDCODED_PLACES.map(place => ({
                ...place,
                user_id: user.id
            }));

            res.json({
                success: true,
                data: { places },
                isLoggedIn: !!user,
            });
        } catch (e) {
            res.json({
                success: false,
                data: { places: [] },
                error: e.message,
                isLoggedIn: false,
            });
        }
    }
);

// GET /places/public/:userId - Public endpoint for published sites (no auth required)
router.get(
    "/public/:userId",
    cors({
        origin: '*', // Allow all origins for public endpoint
    }),
    async (req, res) => {
        try {
            const { userId } = req.params;

            // For now, return hardcoded places for any user
            // In production, this would query the database
            const places = HARDCODED_PLACES.map(place => ({
                ...place,
                user_id: parseInt(userId)
            }));

            res.json({
                success: true,
                data: { places },
            });
        } catch (e) {
            res.json({
                success: false,
                data: { places: [] },
                error: e.message,
            });
        }
    }
);

module.exports = router;
