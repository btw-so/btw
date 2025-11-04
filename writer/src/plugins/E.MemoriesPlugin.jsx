import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getMemories, addMemory, updateMemory, deleteMemory } from "../actions";
import Uppy from "../components/Uppy";

const MemoriesPlugin = () => {
    const dispatch = useDispatch();
    const { memoriesList, addMemoryStatus, updateMemoryStatus, deleteMemoryStatus} = useSelector((state) => state.memories);

    // Fix duplicate bucket name in DigitalOcean Spaces URLs
    const fixImageUrl = (url) => {
        if (!url) return url;
        // Remove duplicate: nyc3.digitaloceanspaces.com/nyc3.digitaloceanspaces.com/bucket-name/file
        // to: nyc3.digitaloceanspaces.com/bucket-name/file
        return url.replace('https://nyc3.digitaloceanspaces.com/nyc3.digitaloceanspaces.com/', 'https://nyc3.digitaloceanspaces.com/');
    };

    // Add/Edit memory form state
    const [showMemoryForm, setShowMemoryForm] = useState(false);
    const [editingMemory, setEditingMemory] = useState(null);
    const [memoryForm, setMemoryForm] = useState({
        place_name: '',
        place_address: '',
        place_type: '',
        latitude: null,
        longitude: null,
        city: '',
        country_code: '',
        name: '',
        description: '',
        visited_date: '',
        photo_urls: [],
        private: false
    });

    // Memory place search state
    const [memoryPlaceQuery, setMemoryPlaceQuery] = useState('');
    const [memoryPlaceResults, setMemoryPlaceResults] = useState([]);
    const [isMemoryPlaceSearching, setIsMemoryPlaceSearching] = useState(false);
    const [showMemoryPlaceResults, setShowMemoryPlaceResults] = useState(false);
    const [selectedMemoryPlace, setSelectedMemoryPlace] = useState(null);
    const memoryPlaceSearchTimeoutRef = useRef(null);

    useEffect(() => {
        dispatch(getMemories({}));
    }, [dispatch]);

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.memory-search-container')) {
                setShowMemoryPlaceResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (memoryPlaceSearchTimeoutRef.current) {
                clearTimeout(memoryPlaceSearchTimeoutRef.current);
            }
        };
    }, []);

    // Format place display name
    const formatPlaceDisplay = (props) => {
        const parts = [];
        if (props.name) parts.push(props.name);
        if (props.city) parts.push(props.city);
        if (props.state) parts.push(props.state);
        if (props.country) parts.push(props.country);
        return parts.join(', ');
    };

    // Handle memory place search with debounce
    const handleMemoryPlaceSearch = async (query) => {
        setMemoryPlaceQuery(query);

        if (!query.trim()) {
            setMemoryPlaceResults([]);
            setShowMemoryPlaceResults(false);
            return;
        }

        // Clear previous timeout
        if (memoryPlaceSearchTimeoutRef.current) {
            clearTimeout(memoryPlaceSearchTimeoutRef.current);
        }

        // Debounce search
        memoryPlaceSearchTimeoutRef.current = setTimeout(async () => {
            setIsMemoryPlaceSearching(true);
            try {
                const response = await fetch(
                    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10`
                );

                if (!response.ok) {
                    throw new Error('Search request failed');
                }

                const data = await response.json();

                const results = (data.features || []).map(feature => ({
                    name: feature.properties?.name || 'Unnamed Place',
                    city: feature.properties?.city,
                    state: feature.properties?.state,
                    country: feature.properties?.country,
                    country_code: feature.properties?.countrycode?.toUpperCase(),
                    latitude: feature.geometry?.coordinates?.[1],
                    longitude: feature.geometry?.coordinates?.[0],
                    type: feature.properties?.type || 'place',
                    display: formatPlaceDisplay(feature.properties || {})
                })).filter(result =>
                    result.latitude &&
                    result.longitude &&
                    result.type !== 'country' && // Exclude countries
                    (result.city || result.name) && // Must have city or name for city field
                    result.country_code // Must have country code
                );

                setMemoryPlaceResults(results);
                setShowMemoryPlaceResults(true);
            } catch (error) {
                console.error('Memory place search error:', error);
                setMemoryPlaceResults([]);
                setShowMemoryPlaceResults(false);
            } finally {
                setIsMemoryPlaceSearching(false);
            }
        }, 500);
    };

    // Handle memory place selection
    const handleSelectMemoryPlace = (place) => {
        setSelectedMemoryPlace(place);
        setShowMemoryPlaceResults(false);
        setMemoryPlaceQuery(place.display);
        setMemoryForm({
            ...memoryForm,
            place_name: place.name,
            place_address: place.display,
            place_type: place.type,
            latitude: place.latitude,
            longitude: place.longitude,
            city: place.city || place.name || '',
            country_code: place.country_code || ''
        });
    };

    // Memory handlers
    const handleAddMemoryClick = () => {
        setShowMemoryForm(true);
        setEditingMemory(null);
        setSelectedMemoryPlace(null);
        setMemoryPlaceQuery('');
        setMemoryForm({
            place_name: '',
            place_address: '',
            place_type: '',
            latitude: null,
            longitude: null,
            city: '',
            country_code: '',
            name: '',
            description: '',
            visited_date: '',
            photo_urls: [],
            private: false
        });
    };

    const handleEditMemory = (memory) => {
        setShowMemoryForm(true);
        setEditingMemory(memory);
        setMemoryPlaceQuery(memory.place_address || memory.place_name || '');
        setSelectedMemoryPlace({
            name: memory.place_name,
            display: memory.place_address || memory.place_name,
            type: memory.place_type,
            latitude: memory.latitude,
            longitude: memory.longitude
        });
        setMemoryForm({
            place_name: memory.place_name || '',
            place_address: memory.place_address || '',
            place_type: memory.place_type || '',
            latitude: memory.latitude || null,
            longitude: memory.longitude || null,
            city: memory.city || '',
            country_code: memory.country_code || '',
            name: memory.name || '',
            description: memory.description || '',
            visited_date: memory.visited_date ? new Date(memory.visited_date).toISOString().split('T')[0] : '',
            photo_urls: memory.photo_urls || [],
            private: memory.private || false
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteMemory = (memory) => {
        if (window.confirm(`Are you sure you want to delete this memory?`)) {
            dispatch(deleteMemory({ memoryId: memory.id }));
        }
    };

    const handleMemoryFormSubmit = (e) => {
        e.preventDefault();

        if (!selectedMemoryPlace && !memoryForm.place_name) {
            alert('Please select a place from the search results');
            return;
        }

        if (!memoryForm.name) {
            alert('Please fill in the name');
            return;
        }

        if (!memoryForm.latitude || !memoryForm.longitude) {
            alert('Please select a valid place with coordinates');
            return;
        }

        if (!memoryForm.city || memoryForm.city.trim() === '') {
            alert('Please select a place with a valid city. Try searching for a more specific location.');
            return;
        }

        if (!memoryForm.country_code || memoryForm.country_code.trim() === '') {
            alert('Please select a place with a valid country. Try searching for a more specific location.');
            return;
        }

        const memoryData = {
            place_name: memoryForm.place_name,
            place_address: memoryForm.place_address || null,
            place_type: memoryForm.place_type || null,
            latitude: memoryForm.latitude,
            longitude: memoryForm.longitude,
            city: memoryForm.city,
            country_code: memoryForm.country_code,
            name: memoryForm.name,
            description: memoryForm.description || null,
            visited_date: memoryForm.visited_date ? new Date(memoryForm.visited_date).toISOString() : null,
            photo_urls: memoryForm.photo_urls || [],
            private: memoryForm.private || false
        };

        if (editingMemory) {
            dispatch(updateMemory({ memoryId: editingMemory.id, memory: memoryData }));
        } else {
            dispatch(addMemory({ memory: memoryData }));
        }
    };

    const handleCancelMemoryForm = () => {
        setShowMemoryForm(false);
        setEditingMemory(null);
        setSelectedMemoryPlace(null);
        setMemoryPlaceQuery('');
        setMemoryPlaceResults([]);
        setShowMemoryPlaceResults(false);
        setMemoryForm({
            place_name: '',
            place_address: '',
            place_type: '',
            latitude: null,
            longitude: null,
            city: '',
            country_code: '',
            name: '',
            description: '',
            visited_date: '',
            photo_urls: [],
            private: false
        });
    };

    const handlePhotosUploaded = ({ urls }) => {
        setMemoryForm(prev => ({
            ...prev,
            photo_urls: [...prev.photo_urls, ...urls]
        }));
    };

    const handleRemovePhoto = (index) => {
        setMemoryForm(prev => ({
            ...prev,
            photo_urls: prev.photo_urls.filter((_, i) => i !== index)
        }));
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

    // Show success/error messages for memory operations
    const prevAddMemoryStatusRef = useRef(null);
    const isMountedRef = useRef(false);
    
    useEffect(() => {
        // Skip on initial mount if status is already error (from persisted state)
        if (!isMountedRef.current) {
            isMountedRef.current = true;
            prevAddMemoryStatusRef.current = addMemoryStatus?.status;
            return;
        }

        const prevStatus = prevAddMemoryStatusRef.current;
        const currentStatus = addMemoryStatus?.status;

        if (currentStatus === 'success' && prevStatus !== 'success') {
            console.log('Memory added successfully!');
            handleCancelMemoryForm();
        }
        if (currentStatus === 'error' && prevStatus !== 'error' && prevStatus !== null) {
            console.error('Failed to add memory:', addMemoryStatus.error);
            alert('Failed to add memory. Please try again.');
        }

        prevAddMemoryStatusRef.current = currentStatus;
    }, [addMemoryStatus]);

    useEffect(() => {
        if (updateMemoryStatus?.status === 'success') {
            console.log('Memory updated successfully!');
            handleCancelMemoryForm();
        }
        if (updateMemoryStatus?.status === 'error') {
            console.error('Failed to update memory:', updateMemoryStatus.error);
            alert('Failed to update memory. Please try again.');
        }
    }, [updateMemoryStatus]);

    return (
        <>
            {/* Add/Edit Memory Modal */}
            {showMemoryForm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        maxWidth: '42rem',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            position: 'sticky',
                            top: 0,
                            backgroundColor: 'white',
                            borderBottom: '1px solid #e5e7eb',
                            padding: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            zIndex: 100
                        }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                                {editingMemory ? 'Edit memory' : 'Add new memory'}
                            </h3>
                            <button
                                type="button"
                                onClick={handleCancelMemoryForm}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    padding: '0.25rem'
                                }}
                            >
                                <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleMemoryFormSubmit}>
                            <div style={{ padding: '1.5rem' }}>
                                <div className="mb-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={memoryForm.name}
                                        onChange={(e) => setMemoryForm({ ...memoryForm, name: e.target.value })}
                                        placeholder="e.g., Was born, yayy!"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                                        required
                                    />
                                </div>

                                {/* Place Search */}
                                <div className="mb-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Place *
                                    </label>
                                    <div className="relative memory-search-container">
                                        <input
                                            type="text"
                                            value={memoryPlaceQuery}
                                            onChange={(e) => handleMemoryPlaceSearch(e.target.value)}
                                            onFocus={() => memoryPlaceResults.length > 0 && setShowMemoryPlaceResults(true)}
                                            placeholder="Search for a city, place, restaurant..."
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                                            required
                                        />

                                        {/* Search Results Dropdown */}
                                        {showMemoryPlaceResults && memoryPlaceResults.length > 0 && (
                                            <div style={{
                                                position: 'absolute',
                                                zIndex: 50,
                                                width: '100%',
                                                marginTop: '0.5rem',
                                                backgroundColor: 'white',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '0.5rem',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                maxHeight: '24rem',
                                                overflowY: 'auto'
                                            }}>
                                                {memoryPlaceResults.map((result, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={() => handleSelectMemoryPlace(result)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.75rem 1rem',
                                                            textAlign: 'left',
                                                            border: 'none',
                                                            borderBottom: '1px solid #f3f4f6',
                                                            backgroundColor: 'white',
                                                            cursor: 'pointer',
                                                            transition: 'background-color 0.15s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                                    >
                                                        <div style={{ fontWeight: 500, color: '#111827' }}>{result.name}</div>
                                                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{result.display}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                                                            {getFlagEmoji(result.country_code)} {result.country}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* No Results */}
                                        {showMemoryPlaceResults && memoryPlaceResults.length === 0 && memoryPlaceQuery && !isMemoryPlaceSearching && (
                                            <div style={{
                                                position: 'absolute',
                                                zIndex: 50,
                                                width: '100%',
                                                marginTop: '0.5rem',
                                                backgroundColor: 'white',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '0.5rem',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                padding: '1rem',
                                                textAlign: 'center',
                                                color: '#6b7280'
                                            }}>
                                                No places found. Try a different search term.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={memoryForm.description}
                                        onChange={(e) => setMemoryForm({ ...memoryForm, description: e.target.value })}
                                        placeholder="What do you want to remember about this?"
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={memoryForm.visited_date}
                                        onChange={(e) => setMemoryForm({ ...memoryForm, visited_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                                    />
                                </div>

                                {/* Private Toggle */}
                                <div className="mb-4">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={memoryForm.private}
                                            onChange={(e) => setMemoryForm({ ...memoryForm, private: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm font-bold text-gray-700">
                                            Private (won't appear on map)
                                        </span>
                                    </label>
                                </div>

                                {/* Photo Upload */}
                                <div className="mb-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Photos
                                    </label>
                                    {memoryForm.photo_urls.length > 0 && (
                                        <div className="flex flex-wrap gap-2" style={{ position: 'relative', zIndex: 1, marginBottom: '1rem' }}>
                                            {memoryForm.photo_urls.map((url, index) => (
                                                <div key={index} className="relative" style={{ width: '80px', height: '80px', flexShrink: 0, position: 'relative', zIndex: 10 }}>
                                                    <img
                                                        src={fixImageUrl(url)}
                                                        alt={`Photo ${index + 1}`}
                                                        className="object-cover rounded border border-gray-200"
                                                        style={{ 
                                                            width: '80px', 
                                                            height: '80px', 
                                                            maxWidth: '80px', 
                                                            maxHeight: '80px',
                                                            minWidth: '80px',
                                                            minHeight: '80px',
                                                            display: 'block'
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePhoto(index)}
                                                        className="absolute bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                                                        style={{ 
                                                            width: '20px', 
                                                            height: '20px', 
                                                            fontSize: '12px',
                                                            top: '4px',
                                                            right: '4px',
                                                            zIndex: 1000,
                                                            position: 'absolute'
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <style>{`
                                        .uppy-DashboardItem-previewImg {
                                            max-width: 60px !important;
                                            max-height: 60px !important;
                                            width: 60px !important;
                                            height: 60px !important;
                                            object-fit: cover !important;
                                        }
                                        .uppy-DashboardItem {
                                            max-width: 80px !important;
                                            width: 80px !important;
                                        }
                                        .uppy-DashboardItem-preview {
                                            width: 60px !important;
                                            height: 60px !important;
                                            max-width: 60px !important;
                                            max-height: 60px !important;
                                        }
                                    `}</style>
                                    <div style={{ marginTop: memoryForm.photo_urls.length > 0 ? '0.75rem' : '0' }}>
                                        <Uppy
                                            onResults={handlePhotosUploaded}
                                            allowedFileTypes={['.jpg', '.jpeg', '.png', '.gif', '.webp']}
                                            maxNumberOfFiles={10}
                                            height={150}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                position: 'sticky',
                                bottom: 0,
                                backgroundColor: '#f9fafb',
                                borderTop: '1px solid #e5e7eb',
                                padding: '1rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '0.75rem'
                            }}>
                                <button
                                    type="button"
                                    onClick={handleCancelMemoryForm}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'white',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addMemoryStatus?.status === 'running' || updateMemoryStatus?.status === 'running'}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: 'rgb(59, 130, 246)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        cursor: addMemoryStatus?.status === 'running' || updateMemoryStatus?.status === 'running' ? 'not-allowed' : 'pointer',
                                        opacity: addMemoryStatus?.status === 'running' || updateMemoryStatus?.status === 'running' ? 0.5 : 1,
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    {addMemoryStatus?.status === 'running' || updateMemoryStatus?.status === 'running' ? 'Saving...' : (editingMemory ? 'Update memory' : 'Save memory')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-8 pt-16 pb-10">
                    {/* Header Section */}
                    <div style={{ marginBottom: '30px' }}>
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-3">Memories</h1>
                                <p className="text-sm text-gray-500">
                                    {memoriesList.data.length} {memoriesList.data.length === 1 ? 'memory' : 'memories'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddMemoryClick}
                                style={{ backgroundColor: 'rgb(59, 130, 246)' }}
                                className="px-4 py-2 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                            >
                                + Add memory
                            </button>
                        </div>
                    </div>

                    {memoriesList.status === 'running' && (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderBottomColor: 'rgb(59, 130, 246)' }}></div>
                            <p className="mt-4 text-gray-600">Loading your memories...</p>
                        </div>
                    )}
                    {memoriesList.status === 'success' && memoriesList.data.length > 0 && (
                        <div className="space-y-4">
                            {memoriesList.data.map((memory) => {
                                console.log('Memory render:', {
                                    id: memory.id,
                                    name: memory.name,
                                    photo_urls: memory.photo_urls,
                                    fixed_url: memory.photo_urls[0] ? fixImageUrl(memory.photo_urls[0]) : null,
                                    type: typeof memory.photo_urls,
                                    isArray: Array.isArray(memory.photo_urls)
                                });
                                return (
                                <div
                                    key={memory.id}
                                    className="group bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden"
                                >
                                    <div className="flex">
                                        {/* Image Section */}
                                        <div className="flex-shrink-0" style={{ width: '128px', height: '128px' }}>
                                            {memory.photo_urls && memory.photo_urls.length > 0 ? (
                                                <div className="relative w-full h-full bg-gray-100" style={{ width: '128px', height: '128px', overflow: 'hidden' }}>
                                                    <img
                                                        src={fixImageUrl(memory.photo_urls[0])}
                                                        alt={memory.place_name}
                                                        className="w-full h-full"
                                                        style={{ 
                                                            objectFit: 'cover',
                                                            width: '128px',
                                                            height: '128px',
                                                            display: 'block'
                                                        }}
                                                        onError={(e) => {
                                                            console.error('Image failed to load:', fixImageUrl(memory.photo_urls[0]));
                                                            e.target.style.display = 'none';
                                                        }}
                                                    />
                                                    {memory.photo_urls.length > 1 && (
                                                        <span className="absolute top-2 right-2 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm">
                                                            +{memory.photo_urls.length - 1}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center" style={{ width: '128px', height: '128px' }}>
                                                    <span className="text-4xl">📸</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content Section */}
                                        <div className="flex-grow flex flex-col p-4">
                                            {/* Header with title and actions */}
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-grow min-w-0 pr-3">
                                                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                                                        {memory.name || memory.place_name || 'Untitled Memory'}
                                                    </h3>
                                                    {memory.place_address && (
                                                        <p className="text-xs text-gray-500">
                                                            {memory.place_address}
                                                        </p>
                                                    )}
                                                </div>
                                                {/* Action buttons - top right */}
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditMemory(memory)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                        title="Edit memory"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteMemory(memory)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                        title="Delete memory"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            {memory.description && (
                                                <p className="text-sm text-gray-700 mb-3 leading-snug">
                                                    {memory.description}
                                                </p>
                                            )}

                                            {/* Meta info and Tags */}
                                            <div className="mt-auto pt-3 border-t border-gray-100">
                                                {/* Meta info */}
                                                {memory.visited_date && (
                                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                                        <span className="text-xs text-gray-500 font-medium">
                                                            {new Date(memory.visited_date).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                    {memoriesList.status === 'success' && memoriesList.data.length === 0 && (
                        <div className="text-center py-20">
                            <div className="mb-6">
                                <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-semibold text-gray-900 mb-1">No memories yet</h3>
                            <p className="text-gray-500 mb-8 max-w-md mx-auto">
                                Start capturing your special moments and experiences
                            </p>
                            <button
                                type="button"
                                onClick={handleAddMemoryClick}
                                style={{ backgroundColor: 'rgb(59, 130, 246)' }}
                                className="px-4 py-2 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                            >
                                Add your first memory
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default MemoriesPlugin;
