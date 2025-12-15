import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Zap, Shield, Heart, Swords, Filter, ChevronDown, Loader2, TrendingUp, Award, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar } from 'recharts';

// Type colors configuration
const TYPE_COLORS = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
  grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC'
};

const TYPES = Object.keys(TYPE_COLORS);

function App() {
  // State management
  const [pokemon, setPokemon] = useState([]);
  const [filteredPokemon, setFilteredPokemon] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [compareList, setCompareList] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('id');
  const [minStats, setMinStats] = useState({ hp: 0, attack: 0, defense: 0, speed: 0 });

  // Fetch all Pokemon data on mount
  useEffect(() => {
    fetchPokemon();
  }, []);

  const fetchPokemon = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all Pokémon up to Generation 9 (1025 total)
      const limit = 1025;
      
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Fetch detailed information for each Pokemon
      const detailedPokemon = await Promise.all(
        data.results.map(async (p) => {
          try {
            const details = await fetch(p.url);
            if (!details.ok) throw new Error(`Failed to fetch ${p.name}`);
            return await details.json();
          } catch (err) {
            console.error(`Error fetching ${p.name}:`, err);
            return null;
          }
        })
      );

      const validPokemon = detailedPokemon.filter(p => p !== null);
      setPokemon(validPokemon);
      setFilteredPokemon(validPokemon);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching Pokemon:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce function to reduce API calls
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Filter and sort Pokemon based on criteria
  const filterPokemon = useCallback(
    debounce((search, types, stats, sort) => {
      let filtered = [...pokemon];

      // Search filter
      if (search) {
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.id.toString().includes(search)
        );
      }

      // Type filter
      if (types.length > 0) {
        filtered = filtered.filter(p =>
          p.types.some(t => types.includes(t.type.name))
        );
      }

      // Stats filter
      filtered = filtered.filter(p => {
        const pokemonStats = {
          hp: p.stats.find(s => s.stat.name === 'hp')?.base_stat || 0,
          attack: p.stats.find(s => s.stat.name === 'attack')?.base_stat || 0,
          defense: p.stats.find(s => s.stat.name === 'defense')?.base_stat || 0,
          speed: p.stats.find(s => s.stat.name === 'speed')?.base_stat || 0,
        };

        return (
          pokemonStats.hp >= stats.hp &&
          pokemonStats.attack >= stats.attack &&
          pokemonStats.defense >= stats.defense &&
          pokemonStats.speed >= stats.speed
        );
      });

      // Sort
      filtered.sort((a, b) => {
        switch (sort) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'hp':
            return (b.stats.find(s => s.stat.name === 'hp')?.base_stat || 0) -
                   (a.stats.find(s => s.stat.name === 'hp')?.base_stat || 0);
          case 'attack':
            return (b.stats.find(s => s.stat.name === 'attack')?.base_stat || 0) -
                   (a.stats.find(s => s.stat.name === 'attack')?.base_stat || 0);
          case 'total':
            const totalA = a.stats.reduce((sum, s) => sum + s.base_stat, 0);
            const totalB = b.stats.reduce((sum, s) => sum + s.base_stat, 0);
            return totalB - totalA;
          default:
            return a.id - b.id;
        }
      });

      setFilteredPokemon(filtered);
    }, 300),
    [pokemon]
  );

  // Apply filters whenever dependencies change
  useEffect(() => {
    filterPokemon(searchTerm, selectedTypes, minStats, sortBy);
  }, [searchTerm, selectedTypes, minStats, sortBy, filterPokemon]);

  // Toggle type selection
  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Comparison functions
  const addToCompare = (p) => {
    if (compareList.length < 3 && !compareList.find(cp => cp.id === p.id)) {
      setCompareList([...compareList, p]);
    }
  };

  const removeFromCompare = (id) => {
    setCompareList(compareList.filter(p => p.id !== id));
  };

  // Get comparison chart data
  const getComparisonData = () => {
    if (compareList.length === 0) return [];

    const statNames = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    
    return statNames.map(statName => {
      const dataPoint = { stat: statName.replace('-', ' ').toUpperCase() };
      compareList.forEach(p => {
        dataPoint[p.name] = p.stats.find(s => s.stat.name === statName)?.base_stat || 0;
      });
      return dataPoint;
    });
  };

  // Get total stats for a Pokemon
  const getTotalStats = (p) => {
    return p.stats.reduce((sum, s) => sum + s.base_stat, 0);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-2xl font-bold">Loading PokéDex...</p>
          <p className="text-white text-sm mt-2">Fetching 1025 Pokémon from PokéAPI</p>
          <p className="text-white text-xs mt-1 opacity-75">This may take a moment...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md text-center shadow-2xl">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Error Loading Data</h2>
          <p className="text-gray-600 mb-2">Unable to fetch Pokémon data</p>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={fetchPokemon}
            className="bg-red-500 text-white px-8 py-3 rounded-lg hover:bg-red-600 transition font-semibold shadow-lg"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-6xl font-bold text-white mb-3 drop-shadow-lg">
            ⚡ PokéDex Explorer
          </h1>
          <p className="text-white text-xl">
            Discover and compare <span className="font-bold">{pokemon.length}</span> Pokémon (Gen 1-9)
          </p>
          <p className="text-white text-sm mt-2 opacity-90">
            Advanced filtering • Real-time search • Interactive comparisons
          </p>
        </header>

        {/* Search and Filter Panel */}
        <div className="bg-white rounded-xl shadow-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or Pokédex number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold shadow-lg"
            >
              <Filter className="w-5 h-5" />
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="space-y-6 pt-6 border-t">
              {/* Sort Options */}
              <div>
                <label className="block text-sm font-bold mb-3 text-gray-700">Sort By:</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'id', label: 'Pokédex #' },
                    { value: 'name', label: 'Name (A-Z)' },
                    { value: 'hp', label: 'HP' },
                    { value: 'attack', label: 'Attack' },
                    { value: 'total', label: 'Total Stats' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${
                        sortBy === option.value
                          ? 'bg-blue-500 text-white shadow-lg'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Filters */}
              <div>
                <label className="block text-sm font-bold mb-3 text-gray-700">
                  Filter by Type: {selectedTypes.length > 0 && `(${selectedTypes.length} selected)`}
                </label>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition shadow-md ${
                        selectedTypes.includes(type)
                          ? 'text-white transform scale-110'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      style={selectedTypes.includes(type) ? { backgroundColor: TYPE_COLORS[type] } : {}}
                    >
                      {type.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minimum Stats Filters */}
              <div>
                <label className="block text-sm font-bold mb-3 text-gray-700">Minimum Stats:</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['hp', 'attack', 'defense', 'speed'].map(stat => (
                    <div key={stat}>
                      <label className="block text-xs font-semibold mb-2 capitalize text-gray-600">
                        Min {stat}: {minStats[stat]}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="150"
                        step="10"
                        value={minStats[stat]}
                        onChange={(e) => setMinStats({ ...minStats, [stat]: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Results Counter */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-600 font-semibold">
              Showing <span className="text-blue-600 font-bold">{filteredPokemon.length}</span> of {pokemon.length} Pokémon
            </span>
            {(searchTerm || selectedTypes.length > 0 || Object.values(minStats).some(v => v > 0)) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedTypes([]);
                  setMinStats({ hp: 0, attack: 0, defense: 0, speed: 0 });
                }}
                className="text-red-500 hover:text-red-700 font-semibold"
              >
                ✕ Clear All Filters
              </button>
            )}
          </div>
        </div>

        {/* Comparison Panel */}
        {compareList.length > 0 && (
          <div className="bg-white rounded-xl shadow-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-8 h-8 text-blue-500" />
                Compare Pokémon
              </h2>
              <button
                onClick={() => setCompareList([])}
                className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Clear All
              </button>
            </div>

            {/* Selected Pokemon Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {compareList.map(p => (
                <div key={p.id} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 relative shadow-lg border-2 border-blue-200">
                  <button
                    onClick={() => removeFromCompare(p.id)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 bg-white rounded-full p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <img 
                    src={p.sprites.other['official-artwork'].front_default} 
                    alt={p.name} 
                    className="w-32 h-32 mx-auto" 
                  />
                  <p className="text-center font-bold text-xl capitalize mt-2">{p.name}</p>
                  <p className="text-center text-gray-500 text-sm">#{String(p.id).padStart(3, '0')}</p>
                  <div className="flex gap-1 justify-center mt-2">
                    {p.types.map(t => (
                      <span
                        key={t.type.name}
                        className="px-2 py-1 rounded-full text-white text-xs font-bold"
                        style={{ backgroundColor: TYPE_COLORS[t.type.name] }}
                      >
                        {t.type.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-center mt-2 text-sm font-semibold text-gray-700">
                    Total: {getTotalStats(p)}
                  </p>
                </div>
              ))}
              
              {/* Add more placeholder */}
              {compareList.length < 3 && (
                <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center border-2 border-dashed border-gray-300">
                  <p className="text-gray-500 text-center">
                    Click "Add to Compare" on any Pokémon card
                  </p>
                </div>
              )}
            </div>

            {/* Comparison Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Radar Chart */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-4 text-center">Stats Comparison (Radar)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={getComparisonData()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="stat" />
                    <PolarRadiusAxis angle={90} domain={[0, 150]} />
                    {compareList.map((p, idx) => (
                      <Radar
                        key={p.id}
                        name={p.name}
                        dataKey={p.name}
                        stroke={['#8884d8', '#82ca9d', '#ffc658'][idx]}
                        fill={['#8884d8', '#82ca9d', '#ffc658'][idx]}
                        fillOpacity={0.4}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Bar Chart */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-4 text-center">Stats Comparison (Bar)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getComparisonData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stat" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {compareList.map((p, idx) => (
                      <Bar
                        key={p.id}
                        dataKey={p.name}
                        fill={['#8884d8', '#82ca9d', '#ffc658'][idx]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Pokemon Grid */}
        {filteredPokemon.length === 0 ? (
          <div className="bg-white rounded-xl shadow-2xl p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Pokémon Found</h3>
            <p className="text-gray-600">Try adjusting your filters or search criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPokemon.map(p => (
              <div
                key={p.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                onClick={() => setSelectedPokemon(p)}
              >
                {/* Pokemon Image */}
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-6 relative">
                  <div className="absolute top-2 right-2 bg-white rounded-full px-3 py-1 text-xs font-bold text-gray-600">
                    #{String(p.id).padStart(3, '0')}
                  </div>
                  <img
                    src={p.sprites.other['official-artwork'].front_default}
                    alt={p.name}
                    className="w-full h-48 object-contain"
                  />
                </div>

                {/* Pokemon Info */}
                <div className="p-4">
                  <h3 className="text-2xl font-bold capitalize mb-2">{p.name}</h3>
                  
                  {/* Types */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {p.types.map(t => (
                      <span
                        key={t.type.name}
                        className="px-3 py-1 rounded-full text-white text-sm font-bold"
                        style={{ backgroundColor: TYPE_COLORS[t.type.name] }}
                      >
                        {t.type.name.toUpperCase()}
                      </span>
                    ))}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div className="flex items-center gap-2 bg-red-50 p-2 rounded">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="font-semibold">{p.stats.find(s => s.stat.name === 'hp')?.base_stat}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-orange-50 p-2 rounded">
                      <Swords className="w-4 h-4 text-orange-500" />
                      <span className="font-semibold">{p.stats.find(s => s.stat.name === 'attack')?.base_stat}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-blue-50 p-2 rounded">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold">{p.stats.find(s => s.stat.name === 'defense')?.base_stat}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-yellow-50 p-2 rounded">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="font-semibold">{p.stats.find(s => s.stat.name === 'speed')?.base_stat}</span>
                    </div>
                  </div>

                  {/* Total Stats Badge */}
                  <div className="flex items-center justify-center gap-2 bg-purple-50 p-2 rounded mb-3">
                    <Award className="w-4 h-4 text-purple-500" />
                    <span className="font-bold text-purple-700">Total: {getTotalStats(p)}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCompare(p);
                      }}
                      className={`py-2 rounded-lg font-semibold transition ${
                        compareList.length >= 3 || compareList.find(cp => cp.id === p.id)
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                      disabled={compareList.length >= 3 || compareList.find(cp => cp.id === p.id)}
                    >
                      {compareList.find(cp => cp.id === p.id) ? '✓ Added' : '+ Compare'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPokemon(p);
                      }}
                      className="bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition font-semibold flex items-center justify-center gap-1"
                    >
                      <Info className="w-4 h-4" />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detailed Pokemon Modal */}
        {selectedPokemon && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm" 
            onClick={() => setSelectedPokemon(null)}
          >
            <div 
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" 
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-500 p-6 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-3xl font-bold capitalize text-white">{selectedPokemon.name}</h2>
                  <p className="text-white text-sm">#{String(selectedPokemon.id).padStart(3, '0')}</p>
                </div>
                <button 
                  onClick={() => setSelectedPokemon(null)} 
                  className="text-white hover:bg-white hover:text-blue-500 rounded-full p-2 transition"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Pokemon Image */}
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 mb-6">
                  <img
                    src={selectedPokemon.sprites.other['official-artwork'].front_default}
                    alt={selectedPokemon.name}
                    className="w-72 h-72 mx-auto object-contain drop-shadow-2xl"
                  />
                </div>

                {/* Types and Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
                      🏷️ Types
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {selectedPokemon.types.map(t => (
                        <span
                          key={t.type.name}
                          className="px-4 py-2 rounded-lg text-white text-lg font-bold shadow-lg"
                          style={{ backgroundColor: TYPE_COLORS[t.type.name] }}
                        >
                          {t.type.name.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
                      📊 Physical Attributes
                    </h3>
                    <div className="space-y-2 text-lg">
                      <div className="flex justify-between bg-blue-50 p-3 rounded-lg">
                        <span className="font-semibold">Height:</span>
                        <span className="font-bold text-blue-600">{(selectedPokemon.height / 10).toFixed(1)}m</span>
                      </div>
                      <div className="flex justify-between bg-green-50 p-3 rounded-lg">
                        <span className="font-semibold">Weight:</span>
                        <span className="font-bold text-green-600">{(selectedPokemon.weight / 10).toFixed(1)}kg</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Section */}
                <div className="mb-6">
                  <h3 className="font-bold text-2xl mb-4 flex items-center gap-2">
                    📈 Base Stats
                  </h3>
                  <div className="space-y-3">
                    {selectedPokemon.stats.map(s => (
                      <div key={s.stat.name}>
                        <div className="flex justify-between mb-2">
                          <span className="capitalize font-semibold text-lg">
                            {s.stat.name.replace('-', ' ')}
                          </span>
                          <span className="font-bold text-xl text-blue-600">{s.base_stat}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-4 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-400 to-blue-600"
                            style={{ width: `${Math.min((s.base_stat / 255) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Total Stats */}
                  <div className="mt-4 bg-purple-100 p-4 rounded-lg border-2 border-purple-300">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xl">Total Base Stats:</span>
                      <span className="font-bold text-3xl text-purple-600">{getTotalStats(selectedPokemon)}</span>
                    </div>
                  </div>
                </div>

                {/* Abilities Section */}
                <div className="mb-6">
                  <h3 className="font-bold text-2xl mb-4 flex items-center gap-2">
                    ⚡ Abilities
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedPokemon.abilities.map(a => (
                      <span 
                        key={a.ability.name} 
                        className="px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-lg capitalize font-semibold text-lg border-2 border-purple-200"
                      >
                        {a.ability.name.replace('-', ' ')}
                        {a.is_hidden && ' 🔒'}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Additional Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold text-xl mb-3">Additional Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-gray-600">Base Experience:</span>
                      <p className="font-bold text-lg">{selectedPokemon.base_experience}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Total Moves:</span>
                      <p className="font-bold text-lg">{selectedPokemon.moves.length}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCompare(selectedPokemon);
                      setSelectedPokemon(null);
                    }}
                    className={`flex-1 py-3 rounded-lg font-bold text-lg transition ${
                      compareList.length >= 3 || compareList.find(cp => cp.id === selectedPokemon.id)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
                    }`}
                    disabled={compareList.length >= 3 || compareList.find(cp => cp.id === selectedPokemon.id)}
                  >
                    {compareList.find(cp => cp.id === selectedPokemon.id) ? '✓ Already in Comparison' : '+ Add to Compare'}
                  </button>
                  <button
                    onClick={() => setSelectedPokemon(null)}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-bold text-lg shadow-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-white mt-12 pb-8">
          <p className="text-sm opacity-90">
            Data provided by <a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer" className="underline font-semibold">PokéAPI</a>
          </p>
          <p className="text-xs mt-2 opacity-75">
            Built with React, Tailwind CSS, and Recharts • All 1025 Pokémon (Gen 1-9)
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;