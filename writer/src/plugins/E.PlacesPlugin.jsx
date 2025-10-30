import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getPlaces } from "../actions";

const PlacesPlugin = () => {
    const dispatch = useDispatch();
    const { placesList } = useSelector((state) => state.places);
    const user = useSelector((state) => state.user.user);

    useEffect(() => {
        dispatch(getPlaces({}));
    }, [dispatch]);

    const cities = placesList.data.filter(p => p.type === 'city');
    const countries = [...new Set(placesList.data.filter(p => p.type === 'country').map(p => p.country_code))];

    const publicMapUrl = user?.slug
        ? `${process.env.REACT_APP_PUBLISHER_URL}?domain=${user.slug}&path=/places`
        : '#';

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Places I've Been</h1>
                <p className="text-gray-600 mb-4">
                    {cities.length} cities visited across {countries.length} countries
                </p>
                <a
                    href={publicMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                    View Public Map
                </a>
            </div>

            {placesList.status === 'running' && (
                <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading places...</p>
                </div>
            )}

            {placesList.status === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
                    Failed to load places. Please try again.
                </div>
            )}

            {placesList.status === 'success' && (
                <>
                    {/* Cities Section */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">Cities</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {cities.map((place) => (
                                <div
                                    key={place.id}
                                    className="border rounded-lg p-4 hover:shadow-md transition"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-grow">
                                            <h3 className="font-semibold text-lg">{place.name}</h3>
                                            {place.visited_date && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {new Date(place.visited_date).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            )}
                                            {place.description && (
                                                <p className="text-sm text-gray-600 mt-2">
                                                    {place.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="ml-2 text-2xl">
                                            📍
                                        </div>
                                    </div>
                                    <div className="mt-3 text-xs text-gray-400">
                                        {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Countries Section */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Countries</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {placesList.data
                                .filter(p => p.type === 'country')
                                .map((place) => (
                                    <div
                                        key={place.id}
                                        className="border rounded-lg p-3 hover:shadow-md transition"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{getFlagEmoji(place.country_code)}</span>
                                            <div>
                                                <h3 className="font-semibold text-sm">{place.name}</h3>
                                                {place.visited_date && (
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(place.visited_date).getFullYear()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </>
            )}

            <div className="mt-8 p-4 bg-gray-50 rounded border border-gray-200">
                <p className="text-sm text-gray-600">
                    <strong>Note:</strong> Places are currently hardcoded for demonstration.
                    Database integration will allow you to add, edit, and delete places in a future update.
                </p>
            </div>
        </div>
    );
};

// Helper function to convert country code to flag emoji
function getFlagEmoji(countryCode) {
    if (!countryCode) return '🌍';

    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

export default PlacesPlugin;
